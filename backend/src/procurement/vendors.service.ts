import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName, VendorStatus } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto, ScorecardDto, UpdateVendorDto, VendorStatusDto } from './dto';
import { ProcurementLogService } from './log.service';
import { overallScore } from './match';
import { classifyTaxId, gstinPanError, normalizeGstin, normalizePan } from './gstin-pan';
import { maskBank, paddedCode } from './numbers';
import { bankAccountsMatch, normalizeTaxId, taxIdsMatch } from './vendor-identity';

const BLOCKED: VendorStatus[] = ['suspended', 'blacklisted'];

const vendorInclude = {
  contacts: true,
  statusChanges: {
    orderBy: { changedAt: 'desc' as const },
    take: 20,
    include: { changedBy: { select: { fullName: true } } },
  },
  complianceDocs: { select: { id: true, title: true, expiresAt: true, filename: true } },
  scorecards: { orderBy: { createdAt: 'desc' as const }, take: 8 },
  internalOwner: { select: { id: true, fullName: true } },
  approvedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.VendorInclude;

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly log: ProcurementLogService,
  ) {}

  async list(query: ListQuery & { status?: string; category?: string }, actor: AuthUser) {
    this.assertRead(actor);
    const { skip, take, orderBy } = parseListQuery(query, [
      'id',
      'legalName',
      'status',
      'createdAt',
    ]);
    const where: Prisma.VendorWhereInput = {
      ...(query.status ? { status: query.status as VendorStatus } : {}),
      ...(query.category ? { categories: { has: query.category } } : {}),
      ...(query.q
        ? {
            OR: [
              { legalName: { contains: query.q, mode: 'insensitive' } },
              { tradingName: { contains: query.q, mode: 'insensitive' } },
              { vendorCode: { contains: query.q, mode: 'insensitive' } },
              { taxId: { contains: query.q, mode: 'insensitive' } },
              { gstin: { contains: query.q, mode: 'insensitive' } },
              { pan: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { contacts: { where: { isPrimary: true }, take: 1 } },
      }),
      this.prisma.vendor.count({ where }),
    ]);
    return { data: rows.map((v) => this.publicVendor(v, this.canSeeBank(actor))), total };
  }

  nameOptions() {
    return this.prisma.vendor.findMany({
      where: { status: { notIn: ['suspended', 'blacklisted'] } },
      select: { id: true, vendorCode: true, legalName: true, tradingName: true },
      orderBy: { legalName: 'asc' },
      take: 500,
    });
  }

  async get(id: number, actor: AuthUser) {
    this.assertRead(actor);
    const vendor = await this.prisma.vendor.findUnique({ where: { id }, include: vendorInclude });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return this.publicVendor(vendor, this.canSeeBank(actor));
  }

  async create(dto: CreateVendorDto, actor: AuthUser) {
    this.assertManage(actor);
    const ids = this.resolveGstinPan(dto);
    await this.assertNoDuplicateVendor({
      taxId: ids.taxId,
      gstin: ids.gstin,
      pan: ids.pan,
      bankAccountNumber: dto.bankAccountNumber,
    });
    const vendor = await this.prisma.vendor.create({
      data: {
        vendorCode: await this.nextCode(),
        legalName: dto.legalName.trim(),
        tradingName: dto.tradingName?.trim(),
        taxId: ids.taxId,
        gstin: ids.gstin,
        pan: ids.pan,
        gstUnregistered: dto.gstUnregistered ?? false,
        country: dto.country?.trim() || 'IN',
        registeredAddress: dto.registeredAddress,
        remitToAddress: dto.remitToAddress,
        paymentTerms: dto.paymentTerms || 'Net 30',
        currency: dto.currency || 'INR',
        bankAccountNumber: dto.bankAccountNumber,
        bankIfscSwift: dto.bankIfscSwift,
        defaultBudgetHead: dto.defaultBudgetHead,
        categories: dto.categories ?? [],
        isPreferred: dto.isPreferred ?? false,
        nextReviewDate: dto.nextReviewDate ? new Date(dto.nextReviewDate) : null,
        internalOwnerId: dto.internalOwnerId,
        contacts: dto.contacts?.length
          ? { create: dto.contacts.map((c) => ({ ...c, name: c.name.trim() })) }
          : undefined,
      },
      include: vendorInclude,
    });
    await this.log.write({
      recordType: 'vendor',
      recordId: vendor.id,
      action: 'create',
      summary: `Vendor ${vendor.vendorCode} created as draft`,
      after: { legalName: vendor.legalName },
      actor,
      auditAction: 'create',
      entityType: 'Vendor',
    });
    return this.publicVendor(vendor, !this.canSeeBank(actor));
  }

  async update(id: number, dto: UpdateVendorDto, actor: AuthUser) {
    this.assertManage(actor);
    const existing = await this.prisma.vendor.findUnique({
      where: { id },
      include: { contacts: true },
    });
    if (!existing) throw new NotFoundException(`Vendor ${id} not found`);

    const ids = this.resolveGstinPan({
      gstin: dto.gstin !== undefined ? dto.gstin : existing.gstin,
      pan: dto.pan !== undefined ? dto.pan : existing.pan,
      taxId: dto.taxId !== undefined ? dto.taxId : existing.taxId,
      gstUnregistered:
        dto.gstUnregistered !== undefined ? dto.gstUnregistered : existing.gstUnregistered,
      country: dto.country !== undefined ? dto.country : existing.country,
    });
    await this.assertNoDuplicateVendor(
      {
        taxId: ids.taxId,
        gstin: ids.gstin,
        pan: ids.pan,
        bankAccountNumber:
          dto.bankAccountNumber !== undefined ? dto.bankAccountNumber : existing.bankAccountNumber,
      },
      id,
    );

    const bankChanged =
      (dto.bankAccountNumber !== undefined &&
        dto.bankAccountNumber !== existing.bankAccountNumber) ||
      (dto.bankIfscSwift !== undefined && dto.bankIfscSwift !== existing.bankIfscSwift);

    const data: Prisma.VendorUpdateInput = {
      legalName: dto.legalName?.trim(),
      tradingName: dto.tradingName?.trim(),
      taxId: ids.taxId,
      gstin: ids.gstin,
      pan: ids.pan,
      gstUnregistered: dto.gstUnregistered,
      country: dto.country,
      registeredAddress: dto.registeredAddress,
      remitToAddress: dto.remitToAddress,
      paymentTerms: dto.paymentTerms,
      currency: dto.currency,
      defaultBudgetHead: dto.defaultBudgetHead,
      categories: dto.categories,
      isPreferred: dto.isPreferred,
      nextReviewDate: dto.nextReviewDate ? new Date(dto.nextReviewDate) : undefined,
      internalOwner: dto.internalOwnerId ? { connect: { id: dto.internalOwnerId } } : undefined,
    };

    if (bankChanged) {
      data.pendingBankAccountNumber = dto.bankAccountNumber ?? existing.bankAccountNumber;
      data.pendingBankIfscSwift = dto.bankIfscSwift ?? existing.bankIfscSwift;
      data.bankChangePending = true;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.contacts) {
        await tx.vendorContact.deleteMany({ where: { vendorId: id } });
        if (dto.contacts.length) {
          await tx.vendorContact.createMany({
            data: dto.contacts.map((c) => ({
              vendorId: id,
              name: c.name.trim(),
              roleTitle: c.roleTitle,
              email: c.email,
              phone: c.phone,
              isPrimary: c.isPrimary ?? false,
            })),
          });
        }
      }
      return tx.vendor.update({ where: { id }, data, include: vendorInclude });
    });

    await this.log.write({
      recordType: 'vendor',
      recordId: id,
      action: bankChanged ? 'bank_change_pending' : 'update',
      summary: bankChanged
        ? `Bank details for ${updated.vendorCode} held for re-approval`
        : `Vendor ${updated.vendorCode} updated`,
      before: { legalName: existing.legalName },
      after: { legalName: updated.legalName, bankChangePending: updated.bankChangePending },
      actor,
      entityType: 'Vendor',
    });
    return this.publicVendor(updated, false);
  }

  async changeStatus(id: number, dto: VendorStatusDto, actor: AuthUser) {
    this.assertManage(actor);
    const existing = await this.prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Vendor ${id} not found`);
    const to = dto.status as VendorStatus;
    if (existing.status === to) throw new BadRequestException(`Vendor is already ${to}`);
    if (to === 'active') {
      await this.assertNoDuplicateVendor(
        {
          taxId: existing.taxId,
          gstin: existing.gstin,
          pan: existing.pan,
          bankAccountNumber: existing.bankAccountNumber,
        },
        id,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.vendor.update({
        where: { id },
        data: {
          status: to,
          approvedById: to === 'active' ? actor.id : existing.approvedById,
          approvedAt: to === 'active' ? new Date() : existing.approvedAt,
        },
        include: vendorInclude,
      });
      await tx.vendorStatusChange.create({
        data: {
          vendorId: id,
          fromStatus: existing.status,
          toStatus: to,
          reason: dto.reason.trim(),
          changedById: actor.id,
        },
      });
      return row;
    });

    await this.log.write({
      recordType: 'vendor',
      recordId: id,
      action: 'status_change',
      summary: `Vendor ${updated.vendorCode} ${existing.status} → ${to}`,
      before: { status: existing.status },
      after: { status: to },
      reason: dto.reason,
      actor,
      auditAction: 'status_change',
      entityType: 'Vendor',
    });
    return this.publicVendor(updated, false);
  }

  async approveBank(id: number, actor: AuthUser) {
    this.assertManage(actor);
    const existing = await this.prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Vendor ${id} not found`);
    if (!existing.bankChangePending)
      throw new BadRequestException('No bank-detail change is pending');
    const updated = await this.prisma.vendor.update({
      where: { id },
      data: {
        bankAccountNumber: existing.pendingBankAccountNumber,
        bankIfscSwift: existing.pendingBankIfscSwift,
        pendingBankAccountNumber: null,
        pendingBankIfscSwift: null,
        bankChangePending: false,
      },
      include: vendorInclude,
    });
    await this.log.write({
      recordType: 'vendor',
      recordId: id,
      action: 'bank_approved',
      summary: `Bank details approved for ${updated.vendorCode}`,
      actor,
      auditAction: 'approve',
      entityType: 'Vendor',
    });
    return this.publicVendor(updated, false);
  }

  async addScorecard(id: number, dto: ScorecardDto, actor: AuthUser) {
    this.assertManage(actor);
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    const overall = overallScore({
      onTime: dto.onTimeDeliveryPct,
      quality: dto.qualityRate,
      price: dto.priceCompetitiveness,
      responsiveness: dto.responsiveness,
    });
    const card = await this.prisma.vendorScorecard.create({
      data: {
        vendorId: id,
        period: dto.period,
        onTimeDeliveryPct: dto.onTimeDeliveryPct,
        qualityRate: dto.qualityRate,
        priceCompetitiveness: dto.priceCompetitiveness,
        responsiveness: dto.responsiveness,
        overallScore: overall,
        notes: dto.notes,
        recordedById: actor.id,
      },
    });
    await this.prisma.vendor.update({ where: { id }, data: { ratingSummary: overall } });
    await this.log.write({
      recordType: 'scorecard',
      recordId: card.id,
      action: 'create',
      summary: `Scorecard ${dto.period} for vendor ${vendor.vendorCode}: ${overall}`,
      after: card,
      actor,
      auditAction: 'create',
      entityType: 'VendorScorecard',
    });
    return card;
  }

  async computedKpis(id: number) {
    const [pos, receipts, defects] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { vendorId: id, status: { in: ['received', 'closed', 'partially_received'] } },
        select: { id: true, deliveryDate: true },
      }),
      this.prisma.goodsReceipt.findMany({
        where: { purchaseOrder: { vendorId: id }, isReversed: false },
        select: { purchaseOrderId: true, receivedAt: true, discrepancy: true },
      }),
      this.prisma.assetMaintenance.count({
        where: { asset: { vendorId: id }, status: { in: ['reported', 'under_repair'] } },
      }),
    ]);
    const firstReceipt = new Map<number, Date>();
    let damaged = 0;
    for (const r of receipts) {
      if (r.discrepancy?.toLowerCase().includes('damaged')) damaged += 1;
      const prev = firstReceipt.get(r.purchaseOrderId);
      if (!prev || r.receivedAt < prev) firstReceipt.set(r.purchaseOrderId, r.receivedAt);
    }
    let onTime = 0;
    let dated = 0;
    for (const po of pos) {
      if (!po.deliveryDate) continue;
      dated += 1;
      const got = firstReceipt.get(po.id);
      if (got && got <= po.deliveryDate) onTime += 1;
    }
    const onTimePct = dated ? Math.round((onTime / dated) * 10000) / 100 : 100;
    const quality = receipts.length
      ? Math.round(((receipts.length - damaged) / receipts.length) * 10000) / 100
      : 100;
    return { onTimePct, quality, openDefects: defects, poCount: pos.length };
  }

  assertSelectable(status: VendorStatus, code: string) {
    if (BLOCKED.includes(status)) {
      throw new BadRequestException(
        `${code} is ${status.replace('_', ' ')} and cannot be selected on a new requisition or PO.`,
      );
    }
  }

  history(id: number, actor: AuthUser) {
    this.assertRead(actor);
    return this.log.list('vendor', id);
  }

  private async nextCode() {
    const last = await this.prisma.vendor.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    return paddedCode('VND', (last?.id ?? 0) + 1);
  }

  private async assertNoDuplicateVendor(
    fields: {
      taxId?: string | null;
      gstin?: string | null;
      pan?: string | null;
      bankAccountNumber?: string | null;
    },
    excludeId?: number,
  ) {
    const others = await this.prisma.vendor.findMany({
      where: excludeId ? { id: { not: excludeId } } : undefined,
      select: {
        id: true,
        vendorCode: true,
        legalName: true,
        taxId: true,
        gstin: true,
        pan: true,
        bankAccountNumber: true,
      },
    });
    const gstin = normalizeGstin(fields.gstin) ?? normalizeGstin(fields.taxId);
    const pan = normalizePan(fields.pan);
    const gstinHit = gstin
      ? others.find((v) => normalizeGstin(v.gstin) === gstin || taxIdsMatch(v.taxId, gstin))
      : undefined;
    if (gstinHit) {
      throw new ConflictException({
        message: `A vendor with this GSTIN already exists (${gstinHit.vendorCode})`,
        existingVendorId: gstinHit.id,
        vendorCode: gstinHit.vendorCode,
        legalName: gstinHit.legalName,
        match: 'gstin',
      });
    }
    const panHit = pan
      ? others.find((v) => normalizePan(v.pan) === pan || taxIdsMatch(v.taxId, pan))
      : undefined;
    if (panHit) {
      throw new ConflictException({
        message: `A vendor with this PAN already exists (${panHit.vendorCode})`,
        existingVendorId: panHit.id,
        vendorCode: panHit.vendorCode,
        legalName: panHit.legalName,
        match: 'pan',
      });
    }
    const taxId = normalizeTaxId(fields.taxId);
    const taxHit = taxId
      ? others.find((v) => taxIdsMatch(v.taxId, fields.taxId))
      : undefined;
    if (taxHit) {
      throw new ConflictException({
        message: `A vendor with this GSTIN/PAN already exists (${taxHit.vendorCode})`,
        existingVendorId: taxHit.id,
        vendorCode: taxHit.vendorCode,
        legalName: taxHit.legalName,
        match: 'taxId',
      });
    }
    const bankHit = others.find((v) =>
      bankAccountsMatch(v.bankAccountNumber, fields.bankAccountNumber),
    );
    if (bankHit) {
      throw new ConflictException({
        message: `A vendor with this bank account already exists (${bankHit.vendorCode})`,
        existingVendorId: bankHit.id,
        vendorCode: bankHit.vendorCode,
        legalName: bankHit.legalName,
        match: 'bankAccount',
      });
    }
  }

  private resolveGstinPan(dto: {
    gstin?: string | null;
    pan?: string | null;
    taxId?: string | null;
    gstUnregistered?: boolean;
    country?: string | null;
  }) {
    const classified = classifyTaxId(dto.taxId);
    const gstin = normalizeGstin(dto.gstin) ?? classified.gstin;
    const pan = normalizePan(dto.pan) ?? classified.pan;
    const err = gstinPanError({
      gstin,
      pan,
      gstUnregistered: dto.gstUnregistered,
      country: dto.country,
    });
    if (err) throw new BadRequestException(err);
    const taxId = gstin ?? pan ?? dto.taxId?.trim() ?? null;
    return { gstin, pan, taxId };
  }

  private canSeeBank(actor: AuthUser) {
    return actor.role === RoleName.SUPER_ADMIN || actor.role === RoleName.IT_ADMIN;
  }

  private publicVendor<
    T extends {
      bankAccountNumber?: string | null;
      bankIfscSwift?: string | null;
      pendingBankAccountNumber?: string | null;
    },
  >(vendor: T, unmask = false) {
    if (unmask) {
      return {
        ...vendor,
        bankAccountMasked: maskBank(vendor.bankAccountNumber),
      };
    }
    return {
      ...vendor,
      bankAccountNumber: maskBank(vendor.bankAccountNumber),
      bankIfscSwift: vendor.bankIfscSwift ? maskBank(vendor.bankIfscSwift) : null,
      pendingBankAccountNumber: vendor.pendingBankAccountNumber
        ? maskBank(vendor.pendingBankAccountNumber)
        : vendor.pendingBankAccountNumber,
      bankAccountMasked: maskBank(vendor.bankAccountNumber),
    };
  }

  private assertRead(actor: AuthUser) {
    if (actor.role !== RoleName.SUPER_ADMIN && actor.role !== RoleName.IT_ADMIN) {
      throw new ForbiddenException('Vendors are limited to Super Admin and IT Admin');
    }
  }

  private assertManage(actor: AuthUser) {
    if (actor.role !== RoleName.SUPER_ADMIN && actor.role !== RoleName.IT_ADMIN) {
      throw new ForbiddenException('Only Super Admin and IT Admin can manage vendors');
    }
  }
}
