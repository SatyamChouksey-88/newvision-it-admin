import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetCondition,
  AssetStatus,
  MaintenanceStatus,
  Prisma,
  RoleName,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const MANUAL_ROLES: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN];

const ASSET_STATUS = new Set<string>(Object.values(AssetStatus));
const ASSET_CONDITION = new Set<string>(Object.values(AssetCondition));
const MAINT_STATUS = new Set<string>(Object.values(MaintenanceStatus));
const TICKET_STATUS = new Set<string>(Object.values(TicketStatus));
const TICKET_PRIORITY = new Set<string>(Object.values(TicketPriority));

const ASSET_FIELDS = new Set([
  'assetCode',
  'brand',
  'model',
  'serialNumber',
  'purchaseDate',
  'purchaseCost',
  'warrantyStart',
  'warrantyEnd',
  'locationId',
  'departmentId',
  'assignedEmployeeId',
  'status',
  'condition',
  'vendor',
  'invoiceNo',
  'createdAt',
]);
const EMPLOYEE_FIELDS = new Set([
  'firstName',
  'lastName',
  'email',
  'phone',
  'designation',
  'isActive',
  'dateJoined',
  'departmentId',
  'locationId',
  'managerId',
  'createdAt',
]);
const ACCESSORY_FIELDS = new Set(['name', 'category', 'quantityTotal', 'quantityCheckedOut']);
const CONSUMABLE_FIELDS = new Set([
  'name',
  'category',
  'quantityTotal',
  'quantityAvailable',
  'lowStockThreshold',
]);
const MAINT_FIELDS = new Set([
  'issue',
  'status',
  'vendor',
  'estimatedCost',
  'actualCost',
  'reportedAt',
  'expectedCompletionDate',
  'completedAt',
  'notes',
]);
const TICKET_FIELDS = new Set([
  'subject',
  'description',
  'categoryId',
  'priority',
  'status',
  'assignedToId',
  'assetId',
  'locationId',
  'dueDate',
  'resolvedAt',
  'closedAt',
  'createdAt',
  'totalTimeSpentMinutes',
]);
const LOCATION_FIELDS = new Set(['code', 'name', 'city', 'address', 'createdAt']);

export interface ManualEditInput {
  reason: string;
  fields: Record<string, unknown>;
}

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  assertManual(actor: AuthUser) {
    if (!MANUAL_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Manual correction is limited to Super Admin and IT Admin');
    }
  }

  async apply(entityType: string, id: number, dto: ManualEditInput, actor: AuthUser) {
    this.assertManual(actor);
    if (!dto.reason || dto.reason.trim().length < 3) {
      throw new BadRequestException('A reason is required for every manual edit');
    }
    const fields = dto.fields ?? {};
    const keys = Object.keys(fields);
    if (keys.length === 0) throw new BadRequestException('No fields to change');

    switch (entityType) {
      case 'Asset':
        return this.patchAsset(id, fields, dto.reason, actor);
      case 'Employee':
        return this.patchEmployee(id, fields, dto.reason, actor);
      case 'Accessory':
        return this.patchAccessory(id, fields, dto.reason, actor);
      case 'Consumable':
        return this.patchConsumable(id, fields, dto.reason, actor);
      case 'AssetMaintenance':
        return this.patchMaintenance(id, fields, dto.reason, actor);
      case 'SupportTicket':
        return this.patchTicket(id, fields, dto.reason, actor);
      case 'Location':
        return this.patchLocation(id, fields, dto.reason, actor);
      default:
        throw new NotFoundException(`Manual edit is not available for ${entityType}`);
    }
  }

  async backfillAssignment(
    assetId: number,
    dto: { employeeId: number; assignedAt: string; notes?: string; reason: string },
    actor: AuthUser,
  ) {
    this.assertManual(actor);
    if (!dto.reason?.trim()) throw new BadRequestException('A reason is required');
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!emp) throw new BadRequestException('Employee not found');
    const assignedAt = new Date(dto.assignedAt);
    const row = await this.prisma.assetAssignment.create({
      data: {
        assetId,
        employeeId: dto.employeeId,
        assignedById: actor.id,
        assignedAt,
        notes: `[Backfilled] ${dto.notes ?? dto.reason}`.trim(),
      },
    });
    await this.audit.record({
      entityType: 'AssetAssignment',
      entityId: row.id,
      action: 'manual_override',
      summary: `Backfilled assignment of ${asset.assetCode} to ${emp.employeeCode}`,
      changedById: actor.id,
      newValue: { ...row, isBackfilled: true, reason: dto.reason },
    });
    return { ...row, isBackfilled: true };
  }

  async backfillMaintenance(
    dto: { assetId: number; issue: string; reportedAt: string; reason: string; status?: MaintenanceStatus },
    actor: AuthUser,
  ) {
    this.assertManual(actor);
    if (!dto.reason?.trim()) throw new BadRequestException('A reason is required');
    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    const reportedAt = new Date(dto.reportedAt);
    const row = await this.prisma.assetMaintenance.create({
      data: {
        assetId: dto.assetId,
        issue: dto.issue,
        status: dto.status ?? 'reported',
        reportedAt,
        reportedById: actor.id,
        notes: `[Backfilled] ${dto.reason}`,
      },
    });
    await this.audit.record({
      entityType: 'AssetMaintenance',
      entityId: row.id,
      action: 'manual_override',
      summary: `Backfilled maintenance on ${asset.assetCode}`,
      changedById: actor.id,
      newValue: { ...row, isBackfilled: true, reason: dto.reason },
    });
    return { ...row, isBackfilled: true };
  }

  private pick(fields: Record<string, unknown>, allowed: Set<string>) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (allowed.has(k)) out[k] = v;
    }
    if (Object.keys(out).length === 0) throw new BadRequestException('No editable fields supplied');
    return out;
  }

  private asDate(v: unknown) {
    if (v == null || v === '') return null;
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid date: ${v}`);
    return d;
  }

  private asInt(v: unknown, label: string) {
    if (v == null || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new BadRequestException(`Invalid ${label}`);
    return n;
  }

  private async patchAsset(id: number, fields: Record<string, unknown>, reason: string, actor: AuthUser) {
    const current = await this.prisma.asset.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Asset not found');
    const picked = this.pick(fields, ASSET_FIELDS);
    if (picked.status && !ASSET_STATUS.has(String(picked.status))) {
      throw new BadRequestException(`Unknown asset status ${picked.status}`);
    }
    if (picked.condition && !ASSET_CONDITION.has(String(picked.condition))) {
      throw new BadRequestException(`Unknown condition ${picked.condition}`);
    }
    if (picked.locationId) {
      const loc = await this.prisma.location.findUnique({ where: { id: Number(picked.locationId) } });
      if (!loc) throw new BadRequestException('Location does not exist');
    }
    if (picked.assignedEmployeeId) {
      const emp = await this.prisma.employee.findUnique({ where: { id: Number(picked.assignedEmployeeId) } });
      if (!emp) throw new BadRequestException('Employee does not exist');
    }
    const data: Prisma.AssetUpdateInput = {};
    for (const [k, v] of Object.entries(picked)) {
      if (['purchaseDate', 'warrantyStart', 'warrantyEnd', 'createdAt'].includes(k)) {
        (data as Record<string, unknown>)[k] = this.asDate(v);
      } else if (['locationId', 'departmentId', 'assignedEmployeeId'].includes(k)) {
        (data as Record<string, unknown>)[k] = this.asInt(v, k);
      } else if (k === 'purchaseCost') {
        data.purchaseCost = v == null || v === '' ? null : new Prisma.Decimal(String(v));
      } else {
        (data as Record<string, unknown>)[k] = v;
      }
    }
    const updated = await this.prisma.asset.update({ where: { id }, data });
    await this.flag(actor, 'Asset', id, reason, picked, current, updated);
    return updated;
  }

  private async patchEmployee(id: number, fields: Record<string, unknown>, reason: string, actor: AuthUser) {
    const current = await this.prisma.employee.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Employee not found');
    const picked = this.pick(fields, EMPLOYEE_FIELDS);
    if (picked.locationId) {
      const loc = await this.prisma.location.findUnique({ where: { id: Number(picked.locationId) } });
      if (!loc) throw new BadRequestException('Location does not exist');
    }
    const data: Prisma.EmployeeUpdateInput = {};
    for (const [k, v] of Object.entries(picked)) {
      if (['dateJoined', 'createdAt'].includes(k)) (data as Record<string, unknown>)[k] = this.asDate(v);
      else if (['departmentId', 'locationId', 'managerId'].includes(k)) {
        (data as Record<string, unknown>)[k] = this.asInt(v, k);
      } else (data as Record<string, unknown>)[k] = v;
    }
    const updated = await this.prisma.employee.update({ where: { id }, data });
    await this.flag(actor, 'Employee', id, reason, picked, current, updated);
    return updated;
  }

  private async patchAccessory(id: number, fields: Record<string, unknown>, reason: string, actor: AuthUser) {
    const current = await this.prisma.accessory.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Accessory not found');
    const picked = this.pick(fields, ACCESSORY_FIELDS);
    const updated = await this.prisma.accessory.update({ where: { id }, data: picked as Prisma.AccessoryUpdateInput });
    await this.flag(actor, 'Accessory', id, reason, picked, current, updated);
    return updated;
  }

  private async patchConsumable(id: number, fields: Record<string, unknown>, reason: string, actor: AuthUser) {
    const current = await this.prisma.consumable.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Consumable not found');
    const picked = this.pick(fields, CONSUMABLE_FIELDS);
    const updated = await this.prisma.consumable.update({
      where: { id },
      data: picked as Prisma.ConsumableUpdateInput,
    });
    await this.flag(actor, 'Consumable', id, reason, picked, current, updated);
    return updated;
  }

  private async patchMaintenance(id: number, fields: Record<string, unknown>, reason: string, actor: AuthUser) {
    const current = await this.prisma.assetMaintenance.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Maintenance ticket not found');
    const picked = this.pick(fields, MAINT_FIELDS);
    if (picked.status && !MAINT_STATUS.has(String(picked.status))) {
      throw new BadRequestException(`Unknown maintenance status ${picked.status}`);
    }
    const data: Prisma.AssetMaintenanceUpdateInput = {};
    for (const [k, v] of Object.entries(picked)) {
      if (['reportedAt', 'expectedCompletionDate', 'completedAt'].includes(k)) {
        (data as Record<string, unknown>)[k] = this.asDate(v);
      } else if (k === 'estimatedCost' || k === 'actualCost') {
        (data as Record<string, unknown>)[k] = v == null || v === '' ? null : new Prisma.Decimal(String(v));
      } else (data as Record<string, unknown>)[k] = v;
    }
    const updated = await this.prisma.assetMaintenance.update({ where: { id }, data });
    await this.flag(actor, 'AssetMaintenance', id, reason, picked, current, updated);
    return updated;
  }

  private async patchTicket(id: number, fields: Record<string, unknown>, reason: string, actor: AuthUser) {
    const current = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Ticket not found');
    const picked = this.pick(fields, TICKET_FIELDS);
    if (picked.status && !TICKET_STATUS.has(String(picked.status))) {
      throw new BadRequestException(`Unknown ticket status ${picked.status}`);
    }
    if (picked.priority && !TICKET_PRIORITY.has(String(picked.priority))) {
      throw new BadRequestException(`Unknown priority ${picked.priority}`);
    }
    const data: Prisma.SupportTicketUpdateInput = {};
    for (const [k, v] of Object.entries(picked)) {
      if (['dueDate', 'resolvedAt', 'closedAt', 'createdAt'].includes(k)) {
        (data as Record<string, unknown>)[k] = this.asDate(v);
      } else if (['categoryId', 'assignedToId', 'assetId', 'locationId', 'totalTimeSpentMinutes'].includes(k)) {
        (data as Record<string, unknown>)[k] = this.asInt(v, k);
      } else (data as Record<string, unknown>)[k] = v;
    }
    const updated = await this.prisma.supportTicket.update({ where: { id }, data });
    await this.flag(actor, 'SupportTicket', id, reason, picked, current, updated);
    return updated;
  }

  private async patchLocation(id: number, fields: Record<string, unknown>, reason: string, actor: AuthUser) {
    const current = await this.prisma.location.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Location not found');
    const picked = this.pick(fields, LOCATION_FIELDS);
    const data: Prisma.LocationUpdateInput = {};
    for (const [k, v] of Object.entries(picked)) {
      if (k === 'createdAt') (data as Record<string, unknown>)[k] = this.asDate(v);
      else (data as Record<string, unknown>)[k] = v;
    }
    const updated = await this.prisma.location.update({ where: { id }, data });
    await this.flag(actor, 'Location', id, reason, picked, current, updated);
    return updated;
  }

  private async flag(
    actor: AuthUser,
    entityType: string,
    entityId: number,
    reason: string,
    fields: Record<string, unknown>,
    oldRow: object,
    newRow: object,
  ) {
    const changes = Object.keys(fields).map((field) => ({
      field,
      old: (oldRow as Record<string, unknown>)[field] ?? null,
      new: (newRow as Record<string, unknown>)[field] ?? fields[field] ?? null,
    }));
    await this.audit.record({
      entityType,
      entityId,
      action: 'manual_override',
      summary: `Manual correction on ${entityType} ${entityId}: ${reason.trim()}`,
      changedById: actor.id,
      oldValue: { reason, changes: changes.map((c) => ({ field: c.field, old: c.old })) },
      newValue: { reason, changes },
    });
  }
}
