import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenancy/context';
import { CreateAuditCycleDto, CreateAuditFindingDto, UpdateAuditCycleDto } from './dto';

@Injectable()
export class AuditCyclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuery) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'name', 'status', 'createdAt']);
    const [data, total] = await Promise.all([
      this.prisma.auditCycle.findMany({
        skip,
        take,
        orderBy,
        include: {
          signedOffBy: { select: { id: true, fullName: true } },
          _count: { select: { findings: true } },
        },
      }),
      this.prisma.auditCycle.count(),
    ]);
    return { data, total };
  }

  async get(id: number) {
    const cycle = await this.prisma.auditCycle.findUnique({
      where: { id },
      include: {
        signedOffBy: { select: { id: true, fullName: true } },
        findings: {
          orderBy: { createdAt: 'desc' },
          include: { asset: { select: { id: true, assetCode: true } } },
        },
      },
    });
    if (!cycle) throw new NotFoundException(`Audit cycle ${id} not found`);
    return cycle;
  }

  async create(dto: CreateAuditCycleDto, _actor: AuthUser) {
    return this.prisma.auditCycle.create({
      data: {
        tenantId: requireTenantId(),
        name: dto.name,
        scopeNote: dto.scopeNote ?? null,
        status: 'draft',
      },
    });
  }

  async update(id: number, dto: UpdateAuditCycleDto) {
    await this.get(id);
    return this.prisma.auditCycle.update({
      where: { id },
      data: {
        name: dto.name,
        scopeNote: dto.scopeNote === undefined ? undefined : dto.scopeNote ?? null,
      },
    });
  }

  async start(id: number) {
    const cycle = await this.get(id);
    if (cycle.status === 'closed') throw new BadRequestException('Closed cycles cannot be restarted');
    return this.prisma.auditCycle.update({
      where: { id },
      data: { status: 'in_progress', startedAt: cycle.startedAt ?? new Date() },
    });
  }

  async close(id: number, actor: AuthUser) {
    const cycle = await this.get(id);
    if (cycle.status === 'closed') return cycle;
    return this.prisma.auditCycle.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        signedOffById: actor.id,
      },
    });
  }

  async addFinding(cycleId: number, dto: CreateAuditFindingDto) {
    const cycle = await this.get(cycleId);
    if (cycle.status === 'closed') throw new BadRequestException('Cannot add findings to a closed cycle');
    return this.prisma.auditCycleFinding.create({
      data: {
        tenantId: requireTenantId(),
        cycleId,
        assetId: dto.assetId ?? null,
        exceptionType: dto.exceptionType,
        notes: dto.notes ?? null,
        evidenceUrl: dto.evidenceUrl ?? null,
      },
      include: { asset: { select: { id: true, assetCode: true } } },
    });
  }

  async exportCsv(id: number): Promise<{ filename: string; body: string }> {
    const cycle = await this.get(id);
    const lines = [
      'cycle,name,status,assetCode,exceptionType,notes,resolvedAt',
      ...cycle.findings.map((f) =>
        [
          cycle.id,
          JSON.stringify(cycle.name),
          cycle.status,
          f.asset?.assetCode ?? '',
          JSON.stringify(f.exceptionType),
          JSON.stringify(f.notes ?? ''),
          f.resolvedAt?.toISOString() ?? '',
        ].join(','),
      ),
    ];
    return {
      filename: `audit-cycle-${id}.csv`,
      body: lines.join('\n'),
    };
  }

  async resolveFinding(cycleId: number, findingId: number) {
    const finding = await this.prisma.auditCycleFinding.findFirst({
      where: { id: findingId, cycleId },
    });
    if (!finding) throw new NotFoundException('Finding not found');
    return this.prisma.auditCycleFinding.update({
      where: { id: findingId },
      data: { resolvedAt: new Date() },
    });
  }

  /**
   * When staff scan or audit-stamp an asset, tie the event to every open audit cycle
   * (exception if location/condition diverges; otherwise record a verified scan).
   */
  async recordPhysicalScan(
    actor: AuthUser,
    asset: { id: number; assetCode: string; locationId: number | null; condition: string | null },
    dto: { locationId?: number; condition?: string; notes?: string },
  ) {
    const tenantId = requireTenantId();
    const open = await this.prisma.auditCycle.findMany({
      where: { tenantId, status: 'in_progress' },
      select: { id: true },
    });
    if (!open.length) return;

    const locationMismatch =
      dto.locationId != null && asset.locationId != null && dto.locationId !== asset.locationId;
    const conditionMismatch =
      dto.condition != null && asset.condition != null && dto.condition !== asset.condition;

    for (const cycle of open) {
      if (locationMismatch) {
        await this.addFinding(cycle.id, {
          assetId: asset.id,
          exceptionType: 'location_mismatch',
          notes:
            dto.notes ??
            `Scan at location ${dto.locationId} but asset ${asset.assetCode} is at ${asset.locationId}`,
        });
        continue;
      }
      if (conditionMismatch) {
        await this.addFinding(cycle.id, {
          assetId: asset.id,
          exceptionType: 'condition_mismatch',
          notes: dto.notes ?? `Scanned condition ${dto.condition} differs from ${asset.condition}`,
        });
        continue;
      }
      const existing = await this.prisma.auditCycleFinding.findFirst({
        where: {
          cycleId: cycle.id,
          assetId: asset.id,
          exceptionType: 'scan_verified',
          resolvedAt: null,
        },
      });
      if (!existing) {
        await this.addFinding(cycle.id, {
          assetId: asset.id,
          exceptionType: 'scan_verified',
          notes: dto.notes ?? `QR/audit scan by ${actor.fullName}`,
        });
      }
    }
  }
}
