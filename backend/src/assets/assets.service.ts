import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Asset, AssetStatus, Prisma, RoleName } from '@prisma/client';
import { AccessoriesService } from '../accessories/accessories.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import {
  assetCodeError,
  assetCodePrefix,
  formatAssetCode,
  normalizeAssetCode,
  parseAssetCode,
} from './asset-code';
import {
  AssignAssetDto,
  BulkAssetsDto,
  ChangeStatusDto,
  CreateAssetDto,
  TransferAssetDto,
  UpdateAssetDto,
  AuditAssetDto,
} from './dto';
import { assertTransition, InvalidTransitionError } from './lifecycle';

const employeeSummary = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.EmployeeSelect;

const assetInclude = {
  category: true,
  location: true,
  department: true,
  assignedEmployee: { select: employeeSummary },
} satisfies Prisma.AssetInclude;

export interface AssetListQuery extends ListQuery {
  status?: string;
  locationId?: string;
  categoryId?: string;
  departmentId?: string;
  assignedEmployeeId?: string;
  warrantyExpiringInDays?: string;
  warrantyExpired?: string;
  /** When 'true', assets with no audit stamp or last audit older than 12 months. */
  unaudited?: string;
}

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly qr: QrService,
    private readonly webhooks: WebhooksService,
    private readonly accessories: AccessoriesService,
  ) {}

  async qrPng(id: number, actor: AuthUser): Promise<Buffer> {
    const asset = await this.get(id, actor);
    return this.qr.pngForCode(asset.assetCode);
  }

  /** Clone category/brand/model/location into a new available asset with a fresh code. */
  async duplicate(id: number, actor: AuthUser) {
    const src = await this.get(id, actor);
    return this.create(
      {
        categoryId: src.categoryId,
        locationId: src.locationId,
        departmentId: src.departmentId ?? undefined,
        brand: src.brand ?? undefined,
        model: src.model ?? undefined,
        condition: src.condition,
        vendor: src.vendor ?? undefined,
      },
      actor,
    );
  }

  /** 20 QR labels per A4 page for the given asset ids (or the latest 20 if none). */
  async labelsPdf(ids: number[] | undefined, actor: AuthUser): Promise<Buffer> {
    const where = {
      ...this.scopeWhere(actor),
      ...(ids?.length ? { id: { in: ids } } : {}),
    };
    const assets = await this.prisma.asset.findMany({
      where,
      orderBy: { id: 'desc' },
      take: ids?.length ? ids.length : 20,
      select: { assetCode: true, brand: true, model: true },
    });
    if (assets.length === 0) {
      throw new NotFoundException('No assets to print labels for');
    }
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ size: 'A4', margin: 24 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const cols = 4;
    const rows = 5;
    const gap = 8;
    const pageW = 595.28 - 48;
    const pageH = 841.89 - 48;
    const cellW = (pageW - gap * (cols - 1)) / cols;
    const cellH = (pageH - gap * (rows - 1)) / rows;
    let i = 0;
    for (const a of assets) {
      if (i > 0 && i % 20 === 0) doc.addPage();
      const slot = i % 20;
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const x = 24 + col * (cellW + gap);
      const y = 24 + row * (cellH + gap);
      doc.roundedRect(x, y, cellW, cellH, 4).stroke('#E9EDF2');
      const png = await this.qr.pngForCode(a.assetCode);
      doc.image(png, x + 18, y + 8, { width: cellW - 36, height: cellW - 36 });
      doc
        .fontSize(8)
        .fillColor('#1F1F1F')
        .text(a.assetCode, x + 4, y + cellH - 28, { width: cellW - 8, align: 'center' });
      doc
        .fontSize(7)
        .fillColor('#64748B')
        .text(`${a.brand ?? ''} ${a.model ?? ''}`.trim() || ' ', x + 4, y + cellH - 16, {
          width: cellW - 8,
          align: 'center',
          ellipsis: true,
        });
      i += 1;
    }
    doc.end();
    return done;
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  async list(query: AssetListQuery, actor: AuthUser) {
    const { skip, take, orderBy } = parseListQuery(query, [
      'id',
      'assetCode',
      'status',
      'brand',
      'model',
      'purchaseDate',
      'purchaseCost',
      'warrantyEnd',
      'createdAt',
      'serialNumber',
      'condition',
    ]);

    const where: Prisma.AssetWhereInput = {
      ...this.scopeWhere(actor),
      ...(query.status ? { status: query.status as AssetStatus } : {}),
      ...(query.locationId ? { locationId: Number(query.locationId) } : {}),
      ...(query.categoryId ? { categoryId: Number(query.categoryId) } : {}),
      ...(query.departmentId ? { departmentId: Number(query.departmentId) } : {}),
      ...(query.assignedEmployeeId ? { assignedEmployeeId: Number(query.assignedEmployeeId) } : {}),
      ...(query.warrantyExpiringInDays
        ? {
            warrantyEnd: {
              gte: new Date(),
              lte: addDays(new Date(), Number(query.warrantyExpiringInDays)),
            },
          }
        : {}),
      ...(query.warrantyExpired === 'true'
        ? {
            warrantyEnd: { not: null, lt: new Date() },
          }
        : {}),
      ...(query.unaudited === 'true'
        ? {
            status: { notIn: ['retired', 'disposed'] },
            OR: [{ lastAuditedAt: null }, { lastAuditedAt: { lt: addDays(new Date(), -365) } }],
          }
        : {}),
      ...(query.q ? this.searchClause(query.q) : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({ where, skip, take, orderBy, include: assetInclude }),
      this.prisma.asset.count({ where }),
    ]);
    return { data, total };
  }

  async get(id: number, actor: AuthUser): Promise<Asset> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, ...this.scopeWhere(actor) },
      include: {
        ...assetInclude,
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            employee: { select: employeeSummary },
            assignedBy: { select: { id: true, fullName: true } },
          },
        },
        transfers: {
          orderBy: { transferredAt: 'desc' },
          include: {
            fromEmployee: { select: employeeSummary },
            toEmployee: { select: employeeSummary },
            fromLocation: { select: { id: true, code: true, name: true } },
            toLocation: { select: { id: true, code: true, name: true } },
            transferredBy: { select: { id: true, fullName: true } },
          },
        },
        maintenance: { orderBy: { reportedAt: 'desc' } },
      },
    });
    if (!asset) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
    return asset;
  }

  // -------------------------------------------------------------------------
  // Create / update / delete
  // -------------------------------------------------------------------------

  async create(dto: CreateAssetDto, actor: AuthUser): Promise<Asset> {
    // Two admins creating in the same location+category at once can both compute the same
    // next sequence; the unique index catches it and we simply recompute and retry.
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.createOnce(dto, actor);
      } catch (e) {
        const isCodeCollision =
          !dto.assetCode?.trim() &&
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          attempt < MAX_ATTEMPTS;
        if (!isCodeCollision) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            const attempted = dto.assetCode?.trim()
              ? normalizeAssetCode(dto.assetCode)
              : '';
            throw new ConflictException(
              attempted
                ? `Asset code ${attempted} already exists`
                : 'Could not allocate a unique asset code — please retry',
            );
          }
          throw e;
        }
      }
    }
  }

  private resolveExplicitCode(raw?: string): string | undefined {
    if (!raw?.trim()) return undefined;
    const code = normalizeAssetCode(raw);
    const err = assetCodeError(code);
    if (err) throw new BadRequestException(err);
    return code;
  }

  private async createOnce(dto: CreateAssetDto, actor: AuthUser): Promise<Asset> {
    const explicit = this.resolveExplicitCode(dto.assetCode);
    const asset = await this.prisma.$transaction(async (tx) => {
      const code = explicit ?? (await this.generateAssetCode(tx, dto.locationId, dto.categoryId));
      const created = await tx.asset.create({
        data: {
          assetCode: code,
          categoryId: dto.categoryId,
          locationId: dto.locationId,
          departmentId: dto.departmentId ?? null,
          brand: dto.brand,
          model: dto.model,
          serialNumber: dto.serialNumber,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
          purchaseCost: dto.purchaseCost ?? null,
          warrantyStart: dto.warrantyStart ? new Date(dto.warrantyStart) : null,
          warrantyEnd: dto.warrantyEnd ? new Date(dto.warrantyEnd) : null,
          condition: dto.condition ?? 'good',
          vendor: dto.vendor,
          invoiceNo: dto.invoiceNo,
          status: 'available',
        },
        include: assetInclude,
      });
      await this.audit.record(
        {
          entityType: 'Asset',
          entityId: created.id,
          action: 'create',
          summary: `Created asset ${created.assetCode}`,
          changedById: actor.id,
          newValue: created,
        },
        tx,
      );
      return created;
    });
    await this.webhooks.emit('asset.created', this.eventData(asset));
    return asset;
  }

  async update(id: number, dto: UpdateAssetDto, actor: AuthUser): Promise<Asset> {
    const before = await this.prisma.asset.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
    if (dto.status && dto.status !== before.status) {
      // status changes must go through the lifecycle validator
      this.assertValidTransition(before.status, dto.status);
    }
    let nextCode: string | undefined;
    if (dto.assetCode != null && String(dto.assetCode).trim() !== '') {
      nextCode = this.resolveExplicitCode(dto.assetCode);
      if (nextCode && nextCode !== before.assetCode) {
        const taken = await this.prisma.asset.findFirst({
          where: { assetCode: nextCode, id: { not: id } },
          select: { id: true },
        });
        if (taken) throw new ConflictException(`Asset code ${nextCode} already exists`);
      } else {
        nextCode = undefined;
      }
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          ...(nextCode ? { assetCode: nextCode } : {}),
          categoryId: dto.categoryId,
          locationId: dto.locationId,
          departmentId: dto.departmentId,
          brand: dto.brand,
          model: dto.model,
          serialNumber: dto.serialNumber,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
          purchaseCost: dto.purchaseCost,
          warrantyStart: dto.warrantyStart ? new Date(dto.warrantyStart) : undefined,
          warrantyEnd: dto.warrantyEnd ? new Date(dto.warrantyEnd) : undefined,
          condition: dto.condition,
          vendor: dto.vendor,
          invoiceNo: dto.invoiceNo,
          status: dto.status,
        },
        include: assetInclude,
      });
      await this.audit.record(
        {
          entityType: 'Asset',
          entityId: id,
          action: dto.status && dto.status !== before.status ? 'status_change' : 'update',
          summary: nextCode
            ? `Renamed ${before.assetCode} → ${nextCode}`
            : `Updated asset ${asset.assetCode}`,
          changedById: actor.id,
          oldValue: before,
          newValue: asset,
        },
        tx,
      );
      return asset;
    });
    if (dto.status && dto.status !== before.status) {
      await this.webhooks.emit('asset.status_changed', {
        ...this.eventData(updated),
        previousStatus: before.status,
      });
    }
    return updated;
  }

  async remove(id: number, actor: AuthUser): Promise<Asset> {
    const asset = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.asset.findUniqueOrThrow({ where: { id } });
      // Detach dependent history rows would violate FK; only allow delete of retired/disposed assets.
      if (!['retired', 'disposed'].includes(existing.status)) {
        throw new BadRequestException(
          'Only retired or disposed assets can be deleted. Retire the asset first.',
        );
      }
      await tx.assetAssignment.deleteMany({ where: { assetId: id } });
      await tx.assetTransfer.deleteMany({ where: { assetId: id } });
      await tx.assetMaintenance.deleteMany({ where: { assetId: id } });
      await tx.notification.deleteMany({ where: { assetId: id } });
      const deleted = await tx.asset.delete({ where: { id } });
      await this.audit.record(
        {
          entityType: 'Asset',
          entityId: id,
          action: 'delete',
          summary: `Deleted asset ${deleted.assetCode}`,
          changedById: actor.id,
          oldValue: existing,
        },
        tx,
      );
      return deleted;
    });
    return asset;
  }

  // -------------------------------------------------------------------------
  // Lifecycle actions
  // -------------------------------------------------------------------------

  async assign(id: number, dto: AssignAssetDto, actor: AuthUser): Promise<Asset> {
    let previousStatus: AssetStatus = 'available';
    const updated = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUniqueOrThrow({ where: { id } });
      previousStatus = asset.status;
      this.assertValidTransition(asset.status, 'assigned');
      const employee = await tx.employee.findUnique({ where: { id: dto.employeeId } });
      if (!employee) {
        throw new BadRequestException(`Employee ${dto.employeeId} not found`);
      }
      if (!employee.isActive) {
        throw new BadRequestException(
          `${employee.employeeCode} is inactive (offboarded) — assets cannot be assigned to them`,
        );
      }
      // close any currently open assignment
      await tx.assetAssignment.updateMany({
        where: { assetId: id, returnedAt: null },
        data: { returnedAt: new Date() },
      });
      await tx.assetAssignment.create({
        data: {
          assetId: id,
          employeeId: dto.employeeId,
          assignedById: actor.id,
          notes: dto.notes,
          expectedReturnAt: dto.expectedReturnAt ? new Date(dto.expectedReturnAt) : null,
        },
      });
      const next = await tx.asset.update({
        where: { id },
        data: { status: 'assigned', assignedEmployeeId: dto.employeeId },
        include: assetInclude,
      });
      await this.audit.record(
        {
          entityType: 'Asset',
          entityId: id,
          action: 'assign',
          summary: `Assigned ${asset.assetCode} to ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
          changedById: actor.id,
          oldValue: { status: asset.status, assignedEmployeeId: asset.assignedEmployeeId },
          newValue: { status: 'assigned', assignedEmployeeId: dto.employeeId },
        },
        tx,
      );
      return next;
    });
    if (updated.status !== previousStatus) {
      await this.webhooks.emit('asset.status_changed', {
        ...this.eventData(updated),
        previousStatus,
      });
    }
    if (dto.accessoryIds?.length) {
      for (const accessoryId of dto.accessoryIds) {
        await this.accessories.checkout(accessoryId, { employeeId: dto.employeeId }, actor);
      }
    }
    return updated;
  }

  async transfer(id: number, dto: TransferAssetDto, actor: AuthUser): Promise<Asset> {
    if (!dto.toEmployeeId && !dto.toLocationId) {
      throw new BadRequestException('Transfer requires a target employee and/or location');
    }
    let previousStatus: AssetStatus = 'available';
    const updated = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUniqueOrThrow({ where: { id } });
      previousStatus = asset.status;
      if (dto.toEmployeeId) {
        const emp = await tx.employee.findUnique({ where: { id: dto.toEmployeeId } });
        if (!emp) {
          throw new BadRequestException(`Employee ${dto.toEmployeeId} not found`);
        }
        if (!emp.isActive) {
          throw new BadRequestException(
            `${emp.employeeCode} is inactive (offboarded) — assets cannot be transferred to them`,
          );
        }
        // Handing a spare/retired asset to a person is a status change and must obey the lifecycle.
        if (asset.status !== 'assigned') {
          this.assertValidTransition(asset.status, 'assigned');
        }
      }
      await tx.assetTransfer.create({
        data: {
          assetId: id,
          fromEmployeeId: asset.assignedEmployeeId,
          toEmployeeId: dto.toEmployeeId ?? asset.assignedEmployeeId,
          fromLocationId: asset.locationId,
          toLocationId: dto.toLocationId ?? asset.locationId,
          transferredById: actor.id,
          reason: dto.reason,
        },
      });
      // if reassigning to a new employee, close old assignment and open a new one
      if (dto.toEmployeeId && dto.toEmployeeId !== asset.assignedEmployeeId) {
        await tx.assetAssignment.updateMany({
          where: { assetId: id, returnedAt: null },
          data: { returnedAt: new Date() },
        });
        await tx.assetAssignment.create({
          data: { assetId: id, employeeId: dto.toEmployeeId, assignedById: actor.id },
        });
      }
      const nextStatus: AssetStatus = dto.toEmployeeId ? 'assigned' : asset.status;
      const updated = await tx.asset.update({
        where: { id },
        data: {
          assignedEmployeeId: dto.toEmployeeId ?? asset.assignedEmployeeId,
          locationId: dto.toLocationId ?? asset.locationId,
          status: nextStatus,
        },
        include: assetInclude,
      });
      await this.audit.record(
        {
          entityType: 'Asset',
          entityId: id,
          action: 'transfer',
          summary: `Transferred asset ${asset.assetCode}`,
          changedById: actor.id,
          oldValue: {
            assignedEmployeeId: asset.assignedEmployeeId,
            locationId: asset.locationId,
          },
          newValue: {
            assignedEmployeeId: dto.toEmployeeId ?? asset.assignedEmployeeId,
            locationId: dto.toLocationId ?? asset.locationId,
          },
        },
        tx,
      );
      return updated;
    });
    if (updated.status !== previousStatus) {
      await this.webhooks.emit('asset.status_changed', {
        ...this.eventData(updated),
        previousStatus,
      });
    }
    return updated;
  }

  async retire(id: number, reason: string | undefined, actor: AuthUser): Promise<Asset> {
    let previousStatus: AssetStatus = 'available';
    const updated = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUniqueOrThrow({ where: { id } });
      previousStatus = asset.status;
      this.assertValidTransition(asset.status, 'retired');
      await tx.assetAssignment.updateMany({
        where: { assetId: id, returnedAt: null },
        data: { returnedAt: new Date() },
      });
      const updated = await tx.asset.update({
        where: { id },
        data: { status: 'retired', assignedEmployeeId: null },
        include: assetInclude,
      });
      await this.audit.record(
        {
          entityType: 'Asset',
          entityId: id,
          action: 'retire',
          summary: `Retired asset ${asset.assetCode}${reason ? ` — ${reason}` : ''}`,
          changedById: actor.id,
          oldValue: { status: asset.status },
          newValue: { status: 'retired' },
        },
        tx,
      );
      return updated;
    });
    await this.webhooks.emit('asset.status_changed', {
      ...this.eventData(updated),
      previousStatus,
    });
    return updated;
  }

  /**
   * Apply one action to many assets. Each id is processed independently so a single
   * invalid transition does not abort the rest (partial success).
   */
  async bulk(dto: BulkAssetsDto, actor: AuthUser) {
    if (dto.action === 'status' && !dto.status) {
      throw new BadRequestException('Bulk status change requires a target status');
    }
    if (dto.action === 'transfer' && !dto.toEmployeeId && !dto.toLocationId) {
      throw new BadRequestException('Bulk transfer requires a target employee and/or location');
    }
    if (dto.action === 'assign' && !dto.employeeId) {
      throw new BadRequestException('Bulk assign requires an employee');
    }
    const results: { id: number; ok: boolean; error?: string }[] = [];
    for (const id of dto.ids) {
      try {
        if (dto.action === 'retire') {
          await this.retire(id, dto.reason, actor);
        } else if (dto.action === 'status' && dto.status) {
          await this.changeStatus(id, { status: dto.status, reason: dto.reason }, actor);
        } else if (dto.action === 'assign' && dto.employeeId) {
          await this.assign(
            id,
            {
              employeeId: dto.employeeId,
              notes: dto.reason,
              expectedReturnAt: dto.expectedReturnAt,
            },
            actor,
          );
        } else {
          await this.transfer(
            id,
            { toEmployeeId: dto.toEmployeeId, toLocationId: dto.toLocationId, reason: dto.reason },
            actor,
          );
        }
        results.push({ id, ok: true });
      } catch (e) {
        results.push({ id, ok: false, error: (e as Error).message });
      }
    }
    return {
      total: dto.ids.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  async stampAudit(id: number, dto: AuditAssetDto, actor: AuthUser) {
    const asset = await this.get(id, actor);
    const lastAuditedAt = new Date();
    const nextAuditDueAt = dto.nextAuditDueAt
      ? new Date(dto.nextAuditDueAt)
      : addDays(lastAuditedAt, 365);
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.asset.update({
        where: { id },
        data: { lastAuditedAt, nextAuditDueAt },
        include: assetInclude,
      });
      await this.audit.record(
        {
          entityType: 'Asset',
          entityId: id,
          action: 'update',
          summary: `Audited ${asset.assetCode}${dto.notes ? ` — ${dto.notes}` : ''}`,
          changedById: actor.id,
          oldValue: { lastAuditedAt: asset.lastAuditedAt, nextAuditDueAt: asset.nextAuditDueAt },
          newValue: { lastAuditedAt, nextAuditDueAt },
        },
        tx,
      );
      return next;
    });
    return updated;
  }

  async changeStatus(id: number, dto: ChangeStatusDto, actor: AuthUser): Promise<Asset> {
    let previousStatus: AssetStatus = 'available';
    const updated = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUniqueOrThrow({ where: { id } });
      previousStatus = asset.status;
      this.assertValidTransition(asset.status, dto.status);
      const clearAssignee = ['available', 'retired', 'disposed', 'lost'].includes(dto.status);
      if (clearAssignee) {
        await tx.assetAssignment.updateMany({
          where: { assetId: id, returnedAt: null },
          data: { returnedAt: new Date() },
        });
      }
      const updated = await tx.asset.update({
        where: { id },
        data: {
          status: dto.status,
          ...(clearAssignee ? { assignedEmployeeId: null } : {}),
        },
        include: assetInclude,
      });
      await this.audit.record(
        {
          entityType: 'Asset',
          entityId: id,
          action: 'status_change',
          summary: `Status ${asset.status} → ${dto.status} for ${asset.assetCode}${
            dto.reason ? ` — ${dto.reason}` : ''
          }`,
          changedById: actor.id,
          oldValue: { status: asset.status },
          newValue: { status: dto.status },
        },
        tx,
      );
      return updated;
    });
    if (updated.status !== previousStatus) {
      await this.webhooks.emit('asset.status_changed', {
        ...this.eventData(updated),
        previousStatus,
      });
    }
    return updated;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private eventData(asset: { id: number; assetCode: string; status: string }) {
    return { id: asset.id, assetCode: asset.assetCode, status: asset.status };
  }

  private assertValidTransition(from: AssetStatus, to: AssetStatus) {
    try {
      assertTransition(from, to);
    } catch (e) {
      if (e instanceof InvalidTransitionError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  /** Compute the next AST-{LOC}-{CAT}-{SEQ} code for a location+category pair. */
  async generateAssetCode(
    tx: Prisma.TransactionClient,
    locationId: number,
    categoryId: number,
  ): Promise<string> {
    const [location, category] = await Promise.all([
      tx.location.findUnique({ where: { id: locationId } }),
      tx.assetCategory.findUnique({ where: { id: categoryId } }),
    ]);
    if (!location) {
      throw new BadRequestException(`Location ${locationId} not found`);
    }
    if (!category) {
      throw new BadRequestException(`Category ${categoryId} not found`);
    }
    // Sequence by code *prefix*, not by current location/category: a transferred asset keeps
    // its original AST-{LOC}-{CAT}- code, so filtering on today's locationId would both miss
    // codes that moved away and count codes that moved in — either way producing duplicates.
    const prefix = assetCodePrefix(location.code, category.code);
    const existing = await tx.asset.findMany({
      where: { assetCode: { startsWith: prefix } },
      select: { assetCode: true },
    });
    let maxSeq = 0;
    for (const { assetCode } of existing) {
      const parsed = parseAssetCode(assetCode);
      if (parsed && parsed.seq > maxSeq) {
        maxSeq = parsed.seq;
      }
    }
    return formatAssetCode(location.code, category.code, maxSeq + 1);
  }

  private scopeWhere(actor: AuthUser): Prisma.AssetWhereInput {
    switch (actor.role) {
      case RoleName.SUPER_ADMIN:
      case RoleName.IT_ADMIN:
      case RoleName.IT_SUPPORT:
        return {};
      case RoleName.MANAGER:
        if (!actor.employeeId) {
          return { id: -1 };
        }
        return {
          assignedEmployee: {
            OR: [{ managerId: actor.employeeId }, { id: actor.employeeId }],
          },
        };
      default:
        if (!actor.employeeId) {
          return { id: -1 };
        }
        return { assignedEmployeeId: actor.employeeId };
    }
  }

  private searchClause(q: string): Prisma.AssetWhereInput {
    return {
      OR: [
        { assetCode: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
      ],
    };
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
