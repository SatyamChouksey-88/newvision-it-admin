import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, RoleName, VendorContractType } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { MailerService } from '../notifications/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import { CONTRACT_RENEWAL_DAYS } from './constants';
import { CreateContractDto, UpdateContractDto } from './dto';
import { ProcurementLogService } from './log.service';
import { addDays } from './numbers';

const MANAGE: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN];

const include = {
  vendor: { select: { id: true, legalName: true, vendorCode: true, internalOwnerId: true } },
  owner: { select: { id: true, fullName: true, email: true } },
  location: true,
  assets: { include: { asset: { select: { id: true, assetCode: true, status: true } } } },
  invoices: { orderBy: { dueDate: 'asc' as const }, take: 12 },
} satisfies Prisma.VendorContractInclude;

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly log: ProcurementLogService,
    private readonly mailer: MailerService,
  ) {}

  async list(query: ListQuery & { type?: string; vendorId?: string }, actor: AuthUser) {
    this.assertManage(actor);
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'endDate', 'startDate', 'value']);
    const where: Prisma.VendorContractWhereInput = {
      ...(query.type ? { type: query.type as VendorContractType } : {}),
      ...(query.vendorId ? { vendorId: Number(query.vendorId) } : {}),
      ...(query.q
        ? {
            OR: [
              { slaTerms: { contains: query.q, mode: 'insensitive' } },
              { vendor: { legalName: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.vendorContract.findMany({ where, skip, take, orderBy, include }),
      this.prisma.vendorContract.count({ where }),
    ]);
    return { data, total };
  }

  async get(id: number, actor: AuthUser) {
    this.assertManage(actor);
    const row = await this.prisma.vendorContract.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException(`Contract ${id} not found`);
    return row;
  }

  async coverageForAsset(assetId: number) {
    return this.prisma.vendorContract.findMany({
      where: { assets: { some: { assetId } } },
      include: { vendor: { select: { legalName: true, vendorCode: true } } },
      orderBy: { endDate: 'desc' },
    });
  }

  async create(dto: CreateContractDto, actor: AuthUser) {
    this.assertManage(actor);
    const row = await this.prisma.vendorContract.create({
      data: {
        vendorId: dto.vendorId,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        value: dto.value,
        autoRenew: dto.autoRenew ?? false,
        noticePeriodDays: dto.noticePeriodDays ?? 30,
        slaTerms: dto.slaTerms,
        entitlementCount: dto.entitlementCount,
        usageCount: dto.usageCount,
        locationId: dto.locationId,
        ownerId: dto.ownerId ?? actor.id,
        assets: dto.assetIds?.length
          ? { create: dto.assetIds.map((assetId) => ({ assetId })) }
          : undefined,
      },
      include,
    });
    await this.log.write({
      recordType: 'contract',
      recordId: row.id,
      action: 'create',
      summary: `Contract #${row.id} created for vendor ${row.vendor.legalName}`,
      actor,
      auditAction: 'create',
      entityType: 'VendorContract',
    });
    return row;
  }

  async update(id: number, dto: UpdateContractDto, actor: AuthUser) {
    const existing = await this.get(id, actor);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.assetIds) {
        await tx.vendorContractAsset.deleteMany({ where: { contractId: id } });
        if (dto.assetIds.length) {
          await tx.vendorContractAsset.createMany({
            data: dto.assetIds.map((assetId) => ({ contractId: id, assetId })),
          });
        }
      }
      return tx.vendorContract.update({
        where: { id },
        data: {
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          value: dto.value,
          autoRenew: dto.autoRenew,
          noticePeriodDays: dto.noticePeriodDays,
          slaTerms: dto.slaTerms,
          entitlementCount: dto.entitlementCount,
          usageCount: dto.usageCount,
        },
        include,
      });
    });
    await this.log.write({
      recordType: 'contract',
      recordId: id,
      action: 'update',
      summary: `Contract #${id} updated`,
      before: { endDate: existing.endDate, value: Number(existing.value) },
      after: { endDate: updated.endDate, value: Number(updated.value) },
      reason: dto.reason,
      actor,
      entityType: 'VendorContract',
    });
    return updated;
  }

  async renew(id: number, actor: AuthUser) {
    const existing = await this.get(id, actor);
    const span = existing.endDate.getTime() - existing.startDate.getTime();
    const start = existing.endDate;
    const end = new Date(start.getTime() + Math.max(span, 24 * 3600 * 1000));
    const clone = await this.prisma.vendorContract.create({
      data: {
        vendorId: existing.vendorId,
        type: existing.type,
        startDate: start,
        endDate: end,
        value: existing.value,
        autoRenew: existing.autoRenew,
        noticePeriodDays: existing.noticePeriodDays,
        slaTerms: existing.slaTerms,
        entitlementCount: existing.entitlementCount,
        usageCount: 0,
        locationId: existing.locationId,
        ownerId: existing.ownerId,
        renewedFromId: existing.id,
        assets: existing.assets.length
          ? { create: existing.assets.map((a) => ({ assetId: a.assetId })) }
          : undefined,
      },
      include,
    });
    await this.log.write({
      recordType: 'contract',
      recordId: clone.id,
      action: 'renew',
      summary: `Contract #${existing.id} renewed as #${clone.id}`,
      actor,
      auditAction: 'create',
      entityType: 'VendorContract',
    });
    return clone;
  }

  history(id: number, actor: AuthUser) {
    return this.get(id, actor).then(() => this.log.list('contract', id));
  }

  /** Daily 08:05 — 90/60/30/7-day contract renewal alerts, de-duplicated per contract+threshold. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'contract-renewal-alerts' })
  async scheduledCheck(): Promise<void> {
    const result = await this.runRenewalCheck();
    this.logger.log(`Contract renewal check: ${result.created} alerts`);
  }

  async runRenewalCheck(now: Date = new Date()): Promise<{ created: number; checked: number }> {
    const horizon = addDays(now, 90);
    const contracts = await this.prisma.vendorContract.findMany({
      where: { endDate: { gte: now, lte: horizon } },
      include: { vendor: true, owner: true },
    });
    let created = 0;
    const admins = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] } } },
      select: { id: true, email: true },
    });
    for (const c of contracts) {
      const days = Math.round((c.endDate.getTime() - now.getTime()) / 86400000);
      const threshold = CONTRACT_RENEWAL_DAYS.find((t) => days === t);
      if (threshold === undefined) continue;
      const marker = `[${threshold}-day]`;
      const already = await this.prisma.notification.count({
        where: { type: 'contract_renewal', title: { contains: `${marker} contract #${c.id}` } },
      });
      if (already > 0) continue;
      const title = `Contract renews in ${threshold} days ${marker} contract #${c.id}`;
      const message = `${c.vendor.legalName} ${c.type} ends ${c.endDate.toISOString().slice(0, 10)}.`;
      const userIds = new Set<number>(admins.map((a) => a.id));
      if (c.ownerId) userIds.add(c.ownerId);
      if (c.vendor.internalOwnerId) userIds.add(c.vendor.internalOwnerId);
      for (const userId of userIds) {
        await this.prisma.notification.create({
          data: { userId, type: 'contract_renewal', title, message },
        });
      }
      await this.mailer.send({
        to: admins.map((a) => a.email),
        subject: title,
        text: message,
      });
      created += 1;
    }
    return { created, checked: contracts.length };
  }

  private assertManage(actor: AuthUser) {
    if (!MANAGE.includes(actor.role))
      throw new ForbiddenException('Only Super Admin and IT Admin can manage contracts');
  }
}
