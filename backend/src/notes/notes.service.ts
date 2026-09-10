import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { isTicketStaff } from '../tickets/tickets.service';

export const NOTE_ENTITY_TYPES = [
  'Asset',
  'Employee',
  'Accessory',
  'Consumable',
  'AssetMaintenance',
  'AssetRequest',
  'SupportTicket',
  'Location',
] as const;
export type NoteEntityType = (typeof NOTE_ENTITY_TYPES)[number];

const EDITORS: Record<NoteEntityType, RoleName[]> = {
  Asset: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN],
  Employee: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN],
  Accessory: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN],
  Consumable: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN],
  AssetMaintenance: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT],
  AssetRequest: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.MANAGER],
  SupportTicket: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT],
  Location: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN],
};

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(entityType: string, entityId: string, actor: AuthUser) {
    const type = this.parseType(entityType);
    await this.assertCanView(type, entityId, actor);
    return this.prisma.recordNote.findMany({
      where: { entityType: type, entityId: String(entityId) },
      orderBy: { occurredAt: 'asc' },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  async create(
    dto: { entityType: string; entityId: string; body: string; occurredAt?: string; isBackfilled?: boolean },
    actor: AuthUser,
  ) {
    const type = this.parseType(dto.entityType);
    await this.assertCanView(type, dto.entityId, actor);
    if (!this.canAdd(type, actor, dto.entityId)) {
      throw new ForbiddenException('You cannot add notes on this record');
    }
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const isBackfilled = Boolean(dto.isBackfilled) || occurredAt.getTime() < Date.now() - 60_000;
    const row = await this.prisma.recordNote.create({
      data: {
        entityType: type,
        entityId: String(dto.entityId),
        body: dto.body,
        authorId: actor.id,
        occurredAt,
        isBackfilled,
      },
      include: { author: { select: { id: true, fullName: true } } },
    });
    await this.audit.record({
      entityType: type,
      entityId: dto.entityId,
      action: 'comment',
      summary: isBackfilled ? `Backfilled note on ${type} ${dto.entityId}` : `Note added on ${type} ${dto.entityId}`,
      changedById: actor.id,
      newValue: { body: dto.body, isBackfilled, occurredAt },
    });
    return row;
  }

  private parseType(raw: string): NoteEntityType {
    if ((NOTE_ENTITY_TYPES as readonly string[]).includes(raw)) return raw as NoteEntityType;
    throw new NotFoundException(`Unknown entity type ${raw}`);
  }

  private canAdd(type: NoteEntityType, actor: AuthUser, entityId: string) {
    if (EDITORS[type].includes(actor.role)) return true;
    if (type === 'AssetRequest' && actor.role === RoleName.EMPLOYEE) return true;
    if (type === 'SupportTicket' && actor.employeeId) return true;
    void entityId;
    return false;
  }

  private async assertCanView(type: NoteEntityType, entityId: string, actor: AuthUser) {
    const id = Number(entityId);
    if (!Number.isFinite(id)) throw new NotFoundException('Invalid id');
    switch (type) {
      case 'Asset': {
        const row = await this.prisma.asset.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Asset not found');
        return;
      }
      case 'Employee': {
        const row = await this.prisma.employee.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Employee not found');
        if (actor.role === RoleName.EMPLOYEE && actor.employeeId !== id) {
          throw new ForbiddenException('Not allowed to view these notes');
        }
        if (actor.role === RoleName.MANAGER && actor.employeeId !== id && row.managerId !== actor.employeeId) {
          throw new ForbiddenException('Not allowed to view these notes');
        }
        return;
      }
      case 'Accessory': {
        const row = await this.prisma.accessory.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Accessory not found');
        return;
      }
      case 'Consumable': {
        const row = await this.prisma.consumable.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Consumable not found');
        return;
      }
      case 'AssetMaintenance': {
        const row = await this.prisma.assetMaintenance.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Maintenance ticket not found');
        return;
      }
      case 'Location': {
        const row = await this.prisma.location.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Location not found');
        return;
      }
      case 'AssetRequest': {
        const row = await this.prisma.assetRequest.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Request not found');
        if (isTicketStaff(actor.role) || actor.role === RoleName.IT_ADMIN || actor.role === RoleName.SUPER_ADMIN) return;
        if (actor.role === RoleName.MANAGER) return;
        if (row.requesterId === actor.employeeId) return;
        throw new ForbiddenException('Not allowed to view these notes');
      }
      case 'SupportTicket': {
        const row = await this.prisma.supportTicket.findUnique({
          where: { id },
          include: { watchers: true },
        });
        if (!row) throw new NotFoundException('Ticket not found');
        if (isTicketStaff(actor.role)) return;
        if (row.raisedById === actor.employeeId) return;
        if (row.watchers.some((w) => w.employeeId === actor.employeeId)) return;
        throw new ForbiddenException('Not allowed to view these notes');
      }
      default:
        throw new NotFoundException('Unknown entity');
    }
  }
}
