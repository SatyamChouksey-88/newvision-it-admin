import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus, MaintenanceStatus, Prisma, RoleName } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { assertTransition, InvalidTransitionError } from '../assets/lifecycle';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { CreateMaintenanceDto, TransitionMaintenanceDto, UpdateMaintenanceDto } from './dto';
import {
  assertMaintenanceTransition,
  InvalidMaintenanceTransitionError,
} from './maintenance-status';

const maintenanceInclude = {
  asset: {
    select: {
      id: true,
      assetCode: true,
      brand: true,
      model: true,
      status: true,
      assignedEmployeeId: true,
      locationId: true,
    },
  },
  reportedBy: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.AssetMaintenanceInclude;

export interface MaintenanceListQuery extends ListQuery {
  status?: string;
  assetId?: string;
  staleDays?: string;
}

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly webhooks: WebhooksService,
  ) {}

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  async list(query: MaintenanceListQuery) {
    const { skip, take, orderBy } = parseListQuery(query, [
      'id',
      'status',
      'reportedAt',
      'expectedCompletionDate',
      'completedAt',
    ]);
    const staleDays = query.staleDays ? Number(query.staleDays) : 0;
    const staleBefore = staleDays > 0 ? new Date(Date.now() - staleDays * 86_400_000) : null;
    const where: Prisma.AssetMaintenanceWhereInput = {
      ...(query.status ? { status: query.status as MaintenanceStatus } : {}),
      ...(query.assetId ? { assetId: Number(query.assetId) } : {}),
      ...(staleBefore
        ? {
            status: query.status
              ? (query.status as MaintenanceStatus)
              : { in: ['reported', 'under_repair'] },
            reportedAt: { lte: staleBefore },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { issue: { contains: query.q, mode: 'insensitive' } },
              { vendor: { contains: query.q, mode: 'insensitive' } },
              { asset: { assetCode: { contains: query.q, mode: 'insensitive' } } },
              ...(/^\d+$/.test(query.q) ? [{ id: Number(query.q) }] : []),
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.assetMaintenance.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { reportedAt: 'desc' },
        include: maintenanceInclude,
      }),
      this.prisma.assetMaintenance.count({ where }),
    ]);
    return { data, total };
  }

  async get(id: number) {
    const record = await this.prisma.assetMaintenance.findUnique({
      where: { id },
      include: maintenanceInclude,
    });
    if (!record) {
      throw new NotFoundException(`Maintenance record ${id} not found`);
    }
    return record;
  }

  // -------------------------------------------------------------------------
  // Create (report an issue)
  // -------------------------------------------------------------------------

  async create(dto: CreateMaintenanceDto, actor: AuthUser) {
    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) {
      throw new BadRequestException(`Asset ${dto.assetId} not found`);
    }
    // Employees may only report issues on an asset currently assigned to them.
    if (actor.role === RoleName.EMPLOYEE && asset.assignedEmployeeId !== actor.employeeId) {
      throw new ForbiddenException('You can only report issues on assets assigned to you');
    }

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.assetMaintenance.create({
        data: {
          assetId: dto.assetId,
          issue: dto.issue,
          vendor: dto.vendor ?? null,
          estimatedCost: dto.estimatedCost ?? null,
          expectedCompletionDate: dto.expectedCompletionDate
            ? new Date(dto.expectedCompletionDate)
            : null,
          notes: dto.notes ?? null,
          reportedById: actor.id,
          status: 'reported',
          supportTicketId: dto.supportTicketId ?? null,
        },
        include: maintenanceInclude,
      });
      await this.audit.record(
        {
          entityType: 'AssetMaintenance',
          entityId: record.id,
          action: 'create',
          summary: `Issue reported on ${asset.assetCode}: ${dto.issue}`,
          changedById: actor.id,
          newValue: record,
        },
        tx,
      );
      // Notify IT (broadcast — userId null) that a new issue was reported.
      await tx.notification.create({
        data: {
          type: 'issue_reported',
          title: `Issue reported: ${asset.assetCode}`,
          message: dto.issue,
          assetId: asset.id,
        },
      });
      return record;
    });
  }

  // -------------------------------------------------------------------------
  // Update non-status fields
  // -------------------------------------------------------------------------

  async update(id: number, dto: UpdateMaintenanceDto, actor: AuthUser) {
    const before = await this.get(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.assetMaintenance.update({
        where: { id },
        data: {
          issue: dto.issue,
          vendor: dto.vendor,
          estimatedCost: dto.estimatedCost,
          actualCost: dto.actualCost,
          expectedCompletionDate: dto.expectedCompletionDate
            ? new Date(dto.expectedCompletionDate)
            : undefined,
          notes: dto.notes,
        },
        include: maintenanceInclude,
      });
      await this.audit.record(
        {
          entityType: 'AssetMaintenance',
          entityId: id,
          action: 'update',
          summary: `Updated repair ticket #${id} for ${before.asset.assetCode}`,
          changedById: actor.id,
          oldValue: before,
          newValue: record,
        },
        tx,
      );
      return record;
    });
    return updated;
  }

  // -------------------------------------------------------------------------
  // Transition (reported → under_repair → repaired → reassigned | cancelled)
  // -------------------------------------------------------------------------

  async transition(id: number, dto: TransitionMaintenanceDto, actor: AuthUser) {
    const statusEvents: { id: number; assetCode: string; status: string; previousStatus: string }[] = [];
    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.assetMaintenance.findUnique({ where: { id } });
      if (!record) {
        throw new NotFoundException(`Maintenance record ${id} not found`);
      }
      this.assertValidMaintenanceTransition(record.status, dto.status);
      const asset = await tx.asset.findUniqueOrThrow({ where: { id: record.assetId } });

      // Couple the asset's lifecycle to the ticket transition.
      await this.applyAssetSideEffect(tx, asset, dto, actor, statusEvents);

      const completed =
        dto.status === 'repaired' || dto.status === 'reassigned' || dto.status === 'cancelled';
      const updated = await tx.assetMaintenance.update({
        where: { id },
        data: {
          status: dto.status,
          actualCost: dto.actualCost ?? undefined,
          notes: dto.notes ?? undefined,
          completedAt: completed ? new Date() : undefined,
        },
        include: maintenanceInclude,
      });
      await this.audit.record(
        {
          entityType: 'AssetMaintenance',
          entityId: id,
          action: 'status_change',
          summary: `Repair ticket #${id} (${asset.assetCode}): ${record.status} → ${dto.status}`,
          changedById: actor.id,
          oldValue: { status: record.status },
          newValue: { status: dto.status },
        },
        tx,
      );
      return updated;
    });
    for (const ev of statusEvents) {
      await this.webhooks.emit('asset.status_changed', ev);
    }
    return updated;
  }

  /** Update the coupled asset's status/assignment for a maintenance transition (same tx). */
  private async applyAssetSideEffect(
    tx: Prisma.TransactionClient,
    asset: { id: number; assetCode: string; status: AssetStatus; assignedEmployeeId: number | null },
    dto: TransitionMaintenanceDto,
    actor: AuthUser,
    statusEvents: { id: number; assetCode: string; status: string; previousStatus: string }[],
  ) {
    const setAssetStatus = async (to: AssetStatus, assignedEmployeeId?: number | null) => {
      if (asset.status === to && assignedEmployeeId === undefined) {
        return; // no-op
      }
      this.assertValidAssetTransition(asset.status, to);
      await tx.asset.update({
        where: { id: asset.id },
        data: { status: to, ...(assignedEmployeeId !== undefined ? { assignedEmployeeId } : {}) },
      });
      statusEvents.push({
        id: asset.id,
        assetCode: asset.assetCode,
        status: to,
        previousStatus: asset.status,
      });
      await this.audit.record(
        {
          entityType: 'Asset',
          entityId: asset.id,
          action: 'status_change',
          summary: `Asset ${asset.assetCode} ${asset.status} → ${to} (maintenance)`,
          changedById: actor.id,
          oldValue: { status: asset.status, assignedEmployeeId: asset.assignedEmployeeId },
          newValue: { status: to, ...(assignedEmployeeId !== undefined ? { assignedEmployeeId } : {}) },
        },
        tx,
      );
    };

    switch (dto.status) {
      case 'under_repair':
        await setAssetStatus('under_repair');
        break;

      case 'repaired':
        // Asset stays under_repair until it is reassigned/returned. No asset change here.
        break;

      case 'reassigned': {
        const targetEmployeeId = dto.toEmployeeId ?? asset.assignedEmployeeId;
        if (targetEmployeeId) {
          const emp = await tx.employee.findUnique({ where: { id: targetEmployeeId } });
          if (!emp) {
            throw new BadRequestException(`Employee ${targetEmployeeId} not found`);
          }
          // Reassigning to a different employee: close the old open assignment, open a new one.
          if (targetEmployeeId !== asset.assignedEmployeeId) {
            await tx.assetAssignment.updateMany({
              where: { assetId: asset.id, returnedAt: null },
              data: { returnedAt: new Date() },
            });
            await tx.assetAssignment.create({
              data: { assetId: asset.id, employeeId: targetEmployeeId, assignedById: actor.id },
            });
          }
          await setAssetStatus('assigned', targetEmployeeId);
        } else {
          await setAssetStatus('available', null);
        }
        break;
      }

      case 'cancelled':
        // If this ticket had driven the asset under_repair, return it to service.
        if (asset.status === 'under_repair') {
          if (asset.assignedEmployeeId) {
            await setAssetStatus('assigned');
          } else {
            await setAssetStatus('available');
          }
        }
        break;
    }
  }

  private assertValidMaintenanceTransition(from: MaintenanceStatus, to: MaintenanceStatus) {
    try {
      assertMaintenanceTransition(from, to);
    } catch (e) {
      if (e instanceof InvalidMaintenanceTransitionError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  private assertValidAssetTransition(from: AssetStatus, to: AssetStatus) {
    try {
      assertTransition(from, to);
    } catch (e) {
      if (e instanceof InvalidTransitionError) {
        throw new BadRequestException(
          `${e.message} (the asset must be in a compatible state for this repair action)`,
        );
      }
      throw e;
    }
  }
}
