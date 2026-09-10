import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RoleName } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { MailerService } from '../notifications/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractTicketNumber,
  isMailLoopOrAutoReply,
  parseRfc822,
  stripQuotedReply,
  type ParsedEmail,
} from './email-parser';
import { TicketsService } from './tickets.service';

export type IngestResult =
  | { action: 'ignored'; reason: string }
  | { action: 'duplicate'; messageId: string }
  | { action: 'rate_limited'; from: string }
  | { action: 'ticket'; ticketId: number; ticketNumber: string; unmatchedSender?: string }
  | { action: 'comment'; ticketId: number; ticketNumber: string; unmatchedSender?: string };

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 15;

@Injectable()
export class EmailInboxService {
  private readonly logger = new Logger(EmailInboxService.name);
  private readonly recentFrom = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
    private readonly mailer: MailerService,
  ) {}

  isConfigured(): boolean {
    return Boolean(process.env.IMAP_HOST || process.env.EMAIL_INGEST_SECRET);
  }

  helpdeskAddress(): string {
    return (
      process.env.HELPDESK_MAILBOX ||
      process.env.MAIL_REPLY_TO ||
      'it@newvision.local'
    ).toLowerCase();
  }

  async status() {
    const row = await this.prisma.emailIngestState.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    return {
      configured: this.isConfigured(),
      mailbox: this.helpdeskAddress(),
      imapHost: process.env.IMAP_HOST || null,
      lastCheckedAt: row.lastCheckedAt,
      lastMessageCount: row.lastMessageCount,
      lastError: row.lastError,
    };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!process.env.IMAP_HOST) {
      return {
        ok: true,
        message:
          'IMAP is not configured. Inbound mail can still be posted to POST /api/email-in/ingest when EMAIL_INGEST_SECRET is set.',
      };
    }
    try {
      const { ImapFlow } = await import('imapflow');
      const client = new ImapFlow({
        host: process.env.IMAP_HOST,
        port: Number(process.env.IMAP_PORT ?? 993),
        secure: process.env.IMAP_SECURE !== 'false',
        auth: { user: process.env.IMAP_USER ?? '', pass: process.env.IMAP_PASS ?? '' },
        logger: false,
      });
      await client.connect();
      await client.logout();
      return { ok: true, message: `Connected to ${process.env.IMAP_HOST}` };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, message };
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'email-in-poll' })
  async scheduledPoll(): Promise<void> {
    if (!process.env.IMAP_HOST) return;
    try {
      const n = await this.pollImap();
      this.logger.log(`Email-in poll imported ${n} message(s)`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Email-in poll failed: ${message}`);
      await this.touchState({ lastError: message });
    }
  }

  async pollImap(): Promise<number> {
    if (!process.env.IMAP_HOST) {
      this.logger.log('Email-in IMAP not configured — skipping poll');
      return 0;
    }
    const { ImapFlow } = await import('imapflow');
    const client = new ImapFlow({
      host: process.env.IMAP_HOST,
      port: Number(process.env.IMAP_PORT ?? 993),
      secure: process.env.IMAP_SECURE !== 'false',
      auth: { user: process.env.IMAP_USER ?? '', pass: process.env.IMAP_PASS ?? '' },
      logger: false,
    });
    await client.connect();
    let imported = 0;
    try {
      const lock = await client.getMailboxLock(process.env.IMAP_MAILBOX || 'INBOX');
      try {
        for await (const msg of client.fetch({ seen: false }, { source: true, uid: true })) {
          const raw = msg.source?.toString('utf8') ?? '';
          if (!raw) continue;
          const result = await this.processRaw(raw);
          imported += result.action === 'ticket' || result.action === 'comment' ? 1 : 0;
          await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
    await this.touchState({ lastMessageCount: imported, lastError: null });
    return imported;
  }

  async processRaw(raw: string): Promise<IngestResult> {
    const parsed = parseRfc822(raw);
    const own = [
      this.helpdeskAddress(),
      extractAddr(process.env.MAIL_FROM),
      extractAddr(process.env.SMTP_USER),
    ].filter(Boolean);

    const loop = isMailLoopOrAutoReply(parsed, own);
    if (loop.skip) {
      this.logger.log(`Email-in discarded ${parsed.messageId}: ${loop.reason}`);
      return { action: 'ignored', reason: loop.reason ?? 'filtered' };
    }

    const existing = await this.prisma.ticketMessage.findUnique({
      where: { messageId: parsed.messageId },
    });
    if (existing) return { action: 'duplicate', messageId: parsed.messageId };

    if (this.isRateLimited(parsed.fromAddress)) {
      await this.notifyAdminsUnmatched(
        parsed.fromAddress,
        `Rate-limited inbound mail from ${parsed.fromAddress}`,
      );
      return { action: 'rate_limited', from: parsed.fromAddress };
    }

    const matched = await this.matchTicket(parsed);
    const employee = await this.prisma.employee.findFirst({
      where: { email: { equals: parsed.fromAddress, mode: 'insensitive' } },
    });
    const user = employee
      ? await this.prisma.user.findUnique({ where: { employeeId: employee.id }, include: { role: true } })
      : await this.prisma.user.findFirst({
          where: { email: { equals: parsed.fromAddress, mode: 'insensitive' } },
          include: { role: true },
        });

    const body = stripQuotedReply(parsed.text) || parsed.text || parsed.subject;

    if (matched) {
      await this.tickets.addPublicOrInternalComment({
        ticket: matched,
        body,
        isInternal: false,
        authorId: user?.id ?? null,
        actorName: user?.fullName ?? parsed.from,
        actorRole: user?.role.name,
        actorEmployeeId: employee?.id ?? user?.employeeId ?? null,
        unmatchedSender: user || employee ? null : parsed.fromAddress,
      });
      await this.storeInbound(matched.id, parsed);
      return {
        action: 'comment',
        ticketId: matched.id,
        ticketNumber: matched.ticketNumber,
        unmatchedSender: user || employee ? undefined : parsed.fromAddress,
      };
    }

    const category =
      (await this.prisma.ticketCategory.findFirst({ where: { code: 'general' } })) ??
      (await this.prisma.ticketCategory.findFirst());
    if (!category) {
      return { action: 'ignored', reason: 'no-ticket-category' };
    }

    const placeholderRaisedBy =
      employee?.id ??
      (await this.prisma.employee.findFirst({ orderBy: { id: 'asc' } }))?.id;
    if (!placeholderRaisedBy) {
      return { action: 'ignored', reason: 'no-employee-to-attach' };
    }

    const actor = await this.systemActor();
    const created = await this.tickets.create(
      {
        subject: parsed.subject.replace(/^((re|fwd):\s*)+/i, '').trim() || parsed.subject,
        description: body,
        categoryId: category.id,
        autoAssign: true,
        raisedByEmployeeId: placeholderRaisedBy,
        channel: 'email',
        unmatchedSender: employee ? null : parsed.fromAddress,
      },
      actor,
    );

    await this.storeInbound(created.id, parsed);
    if (!employee) {
      await this.notifyAdminsUnmatched(
        parsed.fromAddress,
        `Unrecognized sender ${parsed.fromAddress} opened ${created.ticketNumber}`,
      );
    }
    return {
      action: 'ticket',
      ticketId: created.id,
      ticketNumber: created.ticketNumber,
      unmatchedSender: employee ? undefined : parsed.fromAddress,
    };
  }

  private async matchTicket(parsed: ParsedEmail) {
    const ids = [parsed.inReplyTo, ...parsed.references].filter(Boolean) as string[];
    if (ids.length) {
      const hit = await this.prisma.ticketMessage.findFirst({
        where: { messageId: { in: ids } },
        include: {
          ticket: true,
        },
      });
      if (hit?.ticket) return hit.ticket;
    }
    const number = extractTicketNumber(parsed.subject);
    if (number) {
      return this.prisma.supportTicket.findUnique({ where: { ticketNumber: number } });
    }
    return null;
  }

  private async storeInbound(ticketId: number, parsed: ParsedEmail) {
    await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        direction: 'inbound',
        messageId: parsed.messageId,
        inReplyTo: parsed.inReplyTo ?? null,
        references: parsed.references.join(' ') || null,
        fromAddress: parsed.fromAddress,
        toAddress: parsed.to,
        subject: parsed.subject,
      },
    });
  }

  private async systemActor(): Promise<AuthUser> {
    const u = await this.prisma.user.findFirst({
      where: { role: { name: RoleName.SUPER_ADMIN }, isActive: true },
      include: { role: true },
    });
    if (!u) {
      throw new Error('No Super Admin user exists to attribute email-in tickets');
    }
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role.name,
      employeeId: u.employeeId,
    };
  }

  private async notifyAdminsUnmatched(from: string, message: string) {
    const admins = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] } } },
      select: { id: true },
    });
    if (admins.length === 0) return;
    await this.prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: 'support_ticket',
        title: 'Unrecognized email-in sender',
        message,
      })),
    });
    this.logger.warn(message);
    void from;
    void this.mailer;
  }

  private isRateLimited(from: string): boolean {
    const now = Date.now();
    const prev = (this.recentFrom.get(from) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    prev.push(now);
    this.recentFrom.set(from, prev);
    return prev.length > RATE_MAX;
  }

  private async touchState(patch: { lastMessageCount?: number; lastError?: string | null }) {
    await this.prisma.emailIngestState.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        lastCheckedAt: new Date(),
        lastMessageCount: patch.lastMessageCount ?? 0,
        lastError: patch.lastError ?? null,
      },
      update: {
        lastCheckedAt: new Date(),
        ...(patch.lastMessageCount !== undefined ? { lastMessageCount: patch.lastMessageCount } : {}),
        lastError: patch.lastError ?? null,
      },
    });
  }
}

function extractAddr(from?: string): string {
  if (!from) return '';
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}
