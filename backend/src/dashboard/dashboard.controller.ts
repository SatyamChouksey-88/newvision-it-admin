import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssetStatus, Prisma } from '@prisma/client';
import { daysRemaining } from '../common/warranty';
import { PrismaService } from '../prisma/prisma.service';
import { isFreshInstall } from './fresh-install';
import { buildTrendPoints, trendWindowStart } from './trends';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  /** Metric cards + per-location filter. locationId omitted = all locations. */
  @Get('metrics')
  async metrics(@Query('locationId') locationIdRaw?: string) {
    const locationId = locationIdRaw ? Number(locationIdRaw) : undefined;
    const where = locationId ? { locationId } : {};

    const grouped = await this.prisma.asset.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Record<
      AssetStatus,
      number
    >;

    const count = (s: AssetStatus) => byStatus[s] ?? 0;
    const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

    const in90 = new Date();
    in90.setDate(in90.getDate() + 90);
    const warrantyExpiring = await this.prisma.asset.count({
      where: { ...where, warrantyEnd: { gte: new Date(), lte: in90 } },
    });

    return {
      total,
      assigned: count('assigned'),
      available: count('available'),
      underRepair: count('under_repair'),
      retired: count('retired'),
      disposed: count('disposed'),
      lost: count('lost'),
      damaged: count('damaged'),
      pendingAssignment: count('pending_assignment'),
      warrantyExpiring,
      byStatus,
    };
  }

  /** First-run detector: true only when the estate has no locations, employees, or assets. */
  @Get('setup')
  async setup() {
    const [assets, employees, locations, categories] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.employee.count(),
      this.prisma.location.count(),
      this.prisma.assetCategory.count(),
    ]);
    return {
      assetCount: assets,
      employeeCount: employees,
      locationCount: locations,
      categoryCount: categories,
      freshInstall: isFreshInstall({ assets, employees, locations }),
    };
  }

  /** Monthly asset additions for trend charts (last N months, zero-filled, UTC month keys). */
  @Get('trends')
  async trends(@Query('months') monthsRaw = '12', @Query('locationId') locationIdRaw?: string) {
    const months = Math.min(24, Math.max(3, Number(monthsRaw) || 12));
    const locationId = locationIdRaw ? Number(locationIdRaw) : undefined;
    const start = trendWindowStart(months);

    const rows = await this.prisma.$queryRaw<Array<{ month: string; count: number }>>`
      SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
             COUNT(*)::int AS count
      FROM assets
      WHERE created_at >= ${start}
      ${locationId ? Prisma.sql`AND location_id = ${locationId}` : Prisma.empty}
      GROUP BY 1
      ORDER BY 1
    `;

    return buildTrendPoints(rows, months);
  }

  /** Per-location breakdown for the all-locations view. */
  @Get('by-location')
  async byLocation() {
    const locations = await this.prisma.location.findMany({ orderBy: { code: 'asc' } });
    const grouped = await this.prisma.asset.groupBy({
      by: ['locationId', 'status'],
      _count: { _all: true },
    });
    const totals = new Map<number, number>();
    const byStatus = new Map<number, Record<string, number>>();
    for (const g of grouped) {
      totals.set(g.locationId, (totals.get(g.locationId) ?? 0) + g._count._all);
      const bucket = byStatus.get(g.locationId) ?? {};
      bucket[g.status] = g._count._all;
      byStatus.set(g.locationId, bucket);
    }
    return locations.map((l) => ({
      locationId: l.id,
      code: l.code,
      name: l.name,
      city: l.city,
      total: totals.get(l.id) ?? 0,
      byStatus: byStatus.get(l.id) ?? {},
    }));
  }

  /** Assets sorted by warranty days-remaining ascending (most urgent first). */
  @Get('warranty-expiring')
  async warrantyExpiring(
    @Query('locationId') locationIdRaw?: string,
    @Query('withinDays') withinDaysRaw = '90',
  ) {
    const locationId = locationIdRaw ? Number(locationIdRaw) : undefined;
    const withinDays = Number(withinDaysRaw) || 90;
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);
    const assets = await this.prisma.asset.findMany({
      where: {
        ...(locationId ? { locationId } : {}),
        warrantyEnd: { not: null, lte: limit },
        status: { notIn: ['retired', 'disposed'] },
      },
      include: { category: true, location: true, assignedEmployee: true },
      orderBy: { warrantyEnd: 'asc' },
      take: 500,
    });
    return assets.map((a) => ({
      id: a.id,
      assetCode: a.assetCode,
      brand: a.brand,
      model: a.model,
      location: a.location?.code,
      category: a.category?.code,
      warrantyEnd: a.warrantyEnd,
      daysRemaining: a.warrantyEnd ? daysRemaining(a.warrantyEnd) : null,
    }));
  }

  /** Actionable items for the dashboard "needs attention" panel. */
  @Get('attention')
  async attention(@Query('locationId') locationIdRaw?: string) {
    const locationId = locationIdRaw ? Number(locationIdRaw) : undefined;
    const assetWhere = locationId ? { locationId } : {};
    const now = new Date();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const staleBefore = new Date();
    staleBefore.setDate(staleBefore.getDate() - 14);

    const [warrantyUrgent, staleRepairs, lowStock, pendingRequests, approvedRequests] =
      await Promise.all([
        this.prisma.asset.findMany({
          where: {
            ...assetWhere,
            warrantyEnd: { gte: now, lte: in7 },
            status: { notIn: ['retired', 'disposed'] },
          },
          select: { id: true, assetCode: true, warrantyEnd: true },
          orderBy: { warrantyEnd: 'asc' },
          take: 10,
        }),
        this.prisma.assetMaintenance.findMany({
          where: {
            status: { in: ['reported', 'under_repair'] },
            reportedAt: { lte: staleBefore },
            asset: locationId ? { locationId } : undefined,
          },
          include: { asset: { select: { id: true, assetCode: true } } },
          orderBy: { reportedAt: 'asc' },
          take: 10,
        }),
        this.prisma.consumable.findMany({
          where: { quantityAvailable: { lte: this.prisma.consumable.fields.lowStockThreshold } },
          orderBy: { quantityAvailable: 'asc' },
          take: 10,
        }),
        this.prisma.assetRequest.count({ where: { status: 'pending' } }),
        this.prisma.assetRequest.findMany({
          where: { status: 'approved' },
          include: {
            requester: {
              select: { id: true, firstName: true, lastName: true, employeeCode: true },
            },
          },
          orderBy: { reviewedAt: 'asc' },
          take: 10,
        }),
      ]);

    return {
      warrantyUrgent: warrantyUrgent.map((a) => ({
        type: 'warranty' as const,
        id: a.id,
        label: a.assetCode,
        detail: a.warrantyEnd ? `${daysRemaining(a.warrantyEnd)} days left` : '',
        href: `/assets/show/${a.id}`,
      })),
      staleRepairs: staleRepairs.map((t) => ({
        type: 'repair' as const,
        id: t.id,
        label: t.asset.assetCode,
        detail: t.issue.slice(0, 80),
        href: '/maintenance',
      })),
      lowStock: lowStock.map((c) => ({
        type: 'low_stock' as const,
        id: c.id,
        label: c.name,
        detail: `${c.quantityAvailable} left (threshold ${c.lowStockThreshold})`,
        href: '/consumables',
      })),
      pendingRequestCount: pendingRequests,
      toFulfill: approvedRequests.map((r) => ({
        type: 'request' as const,
        id: r.id,
        label: `${r.requester.firstName} ${r.requester.lastName}`,
        detail: r.kind === 'asset' ? 'Asset request' : (r.accessoryName ?? 'Accessory request'),
        href: '/requests',
      })),
    };
  }
}
