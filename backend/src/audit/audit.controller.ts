import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

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
    @Query('action') action?: string,
    @Query('_start') start = '0',
    @Query('_end') end = '25',
  ) {
    const skip = Number(start) || 0;
    const take = Math.min(Math.max(Number(end) - skip || 25, 1), 200);
    const where = {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(action ? { action: action as never } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { changedBy: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: rows, total };
  }
}
