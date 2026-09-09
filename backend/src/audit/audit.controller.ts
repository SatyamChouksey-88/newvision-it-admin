import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditAction, Prisma, RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

const AUDIT_ACTIONS = new Set<string>(Object.values(AuditAction));

/** Accept `action=create`, `action=create,update`, or `action[]=create&action[]=update`. */
function parseActions(raw?: string | string[]): AuditAction[] {
  const list = Array.isArray(raw) ? raw : raw ? raw.split(',') : [];
  return list.map((a) => a.trim()).filter((a) => AUDIT_ACTIONS.has(a)) as AuditAction[];
}

/** Audit log viewer — restricted to Super Admin and IT Admin. Read-only. */
@ApiTags('audit')
@Controller('audit-logs')
@Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string | string[],
    @Query('q') q?: string,
    @Query('_sort') sort?: string,
    @Query('_order') order?: string,
    @Query('_start') start = '0',
    @Query('_end') end = '25',
  ) {
    const skip = Math.max(Number(start) || 0, 0);
    const take = Math.min(Math.max(Number(end) - skip || 25, 1), 200);
    const actions = parseActions(action);
    const where: Prisma.AuditLogWhereInput = {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(actions.length === 1 ? { action: actions[0] } : {}),
      ...(actions.length > 1 ? { action: { in: actions } } : {}),
      ...(q
        ? {
            OR: [
              { summary: { contains: q, mode: 'insensitive' } },
              { entityId: { contains: q, mode: 'insensitive' } },
              { entityType: { contains: q, mode: 'insensitive' } },
              { changedBy: { fullName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const dir: Prisma.SortOrder = (order ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const sortable = new Set(['createdAt', 'action', 'entityType', 'entityId']);
    const orderBy: Prisma.AuditLogOrderByWithRelationInput =
      sort && sortable.has(sort) ? { [sort]: dir } : { createdAt: 'desc' };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy,
        skip,
        take,
        include: { changedBy: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: rows, total };
  }
}
