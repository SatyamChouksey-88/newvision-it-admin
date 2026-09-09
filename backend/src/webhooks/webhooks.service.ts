import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto';
import {
  buildWebhookPayload,
  isWebhookEvent,
  signWebhookBody,
  type WebhookEventName,
} from './signature';

const DELIVER_MS = 2500;

export interface AssetEventPayload {
  id: number;
  assetCode: string;
  status: string;
  [key: string]: unknown;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuery) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'createdAt']);
    const [data, total] = await Promise.all([
      this.prisma.webhookEndpoint.findMany({ skip, take, orderBy }),
      this.prisma.webhookEndpoint.count(),
    ]);
    return { data: data.map(redactSecret), total };
  }

  async get(id: number) {
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!ep) throw new NotFoundException(`Webhook ${id} not found`);
    return redactSecret(ep);
  }

  async create(dto: CreateWebhookDto, actor: AuthUser) {
    this.assertEvents(dto.events);
    const created = await this.prisma.webhookEndpoint.create({
      data: {
        url: dto.url,
        secret: dto.secret || randomBytes(24).toString('hex'),
        events: dto.events,
        isActive: dto.isActive ?? true,
        createdById: actor.id,
      },
    });
    // Return the secret once so the operator can store it; later reads redact it.
    return created;
  }

  async update(id: number, dto: UpdateWebhookDto) {
    await this.get(id);
    if (dto.events) this.assertEvents(dto.events);
    const updated = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        url: dto.url,
        secret: dto.secret,
        events: dto.events,
        isActive: dto.isActive,
      },
    });
    return redactSecret(updated);
  }

  async remove(id: number) {
    await this.get(id);
    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  /** POST JSON to every active subscriber of `event`. Failures are recorded, never thrown. */
  async emit(event: WebhookEventName, data: AssetEventPayload): Promise<void> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { isActive: true, events: { has: event } },
    });
    if (endpoints.length === 0) return;
    await Promise.all(endpoints.map((ep) => this.deliver(ep.id, event, data)));
  }

  private async deliver(id: number, event: WebhookEventName, data: AssetEventPayload) {
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!ep) return;
    const payload = buildWebhookPayload(event, data);
    const body = JSON.stringify(payload);
    const signature = signWebhookBody(ep.secret, body);
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NewVision-Event': event,
          'X-NewVision-Signature': signature,
        },
        body,
        signal: AbortSignal.timeout(DELIVER_MS),
      });
      await this.prisma.webhookEndpoint.update({
        where: { id },
        data: {
          lastStatus: res.status,
          lastError: res.ok ? null : `HTTP ${res.status}`,
          lastAttemptAt: new Date(),
        },
      });
    } catch (e) {
      this.logger.warn(`Webhook ${id} (${event}) failed: ${(e as Error).message}`);
      await this.prisma.webhookEndpoint.update({
        where: { id },
        data: {
          lastStatus: null,
          lastError: (e as Error).message,
          lastAttemptAt: new Date(),
        },
      });
    }
  }

  private assertEvents(events: string[]) {
    const bad = events.filter((e) => !isWebhookEvent(e));
    if (bad.length) {
      throw new BadRequestException(`Unknown webhook event(s): ${bad.join(', ')}`);
    }
  }
}

function redactSecret<T extends { secret: string }>(ep: T): T {
  return { ...ep, secret: '••••••••' };
}
