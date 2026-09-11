import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssetStatus, Prisma, RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { daysRemaining } from '../common/warranty';
import { PrismaService } from '../prisma/prisma.service';
import { isFreshInstall } from './fresh-install';
import { buildTrendPoints, trendWindowStart } from './trends';

const ESTATE_ROLES = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT] as const;

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Estate-wide metric cards + per-location filter. Restricted to IT roles — Manager/Employee
   * get their own scoped `my-summary`/`team-summary` endpoints instead, so a non-IT client can
   * never pull full-estate numbers even by calling the API directly.
   */
  @Roles(...ESTATE_ROLES)
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
      // B12: SEED_ON_START (docker-entrypoint.sh) wipes and reseeds on every container
      // restart if left on — surfaced so IT Admin/Super Admin sees a clear warning rather
      // than losing real data silently. Only meaningful in the docker-compose deployment.
      seedOnStart: process.env.SEED_ON_START === 'true',
    };
  }

  /**
   * Estate growth over the last N months (UTC).
   * Each point has `added` (that month) and `total`/`count` (cumulative estate size at month end).
   * Assets created before the window are the baseline so the line starts at the real estate size.
   */
  @Get('trends')
  async trends(@Query('months') monthsRaw = '12', @Query('locationId') locationIdRaw?: string) {
    const months = Math.min(24, Math.max(3, Number(monthsRaw) || 12));
    const locationId = locationIdRaw ? Number(locationIdRaw) : undefined;
    const start = trendWindowStart(months);
    const locFilter = locationId ? Prisma.sql`AND location_id = ${locationId}` : Prisma.empty;

    const [rows, baselineRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ month: string; count: number }>>`
        SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
               COUNT(*)::int AS count
        FROM assets
        WHERE created_at >= ${start}
        ${locFilter}
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM assets
        WHERE created_at < ${start}
        ${locFilter}
      `,
    ]);

    return buildTrendPoints(rows, months, new Date(), Number(baselineRows[0]?.count ?? 0));
  }

  /** Per-location breakdown for the all-locations view. */
  @Roles(...ESTATE_ROLES)
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
  @Roles(...ESTATE_ROLES)
  @Get('warranty-expiring')
  async warrantyExpiring(
    @Query('locationId') locationIdRaw?: string,
    @Query('withinDays') withinDaysRaw = '30',
    @Query('bucket') bucketRaw = 'expiring',
  ) {
    const locationId = locationIdRaw ? Number(locationIdRaw) : undefined;
    const withinDays = Number(withinDaysRaw) || 30;
    const bucket = bucketRaw === 'expired' ? 'expired' : 'expiring';
    const now = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);
    const warrantyEnd =
      bucket === 'expired'
        ? { not: null as const, lt: now }
        : { gte: now, lte: limit };
    const assets = await this.prisma.asset.findMany({
      where: {
        ...(locationId ? { locationId } : {}),
        warrantyEnd,
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
      bucket,
    }));
  }

  /** Ticket counts for a date window. preset=today|yesterday|tomorrow|range */
  @Roles(...ESTATE_ROLES)
  @Get('tickets')
  async tickets(
    @Query('preset') preset?: string,
    @Query('from') fromRaw?: string,
    @Query('to') toRaw?: string,
  ) {
    const now = new Date();
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    let from = startOf(now);
    let to = endOf(now);
    if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = startOf(y);
      to = endOf(y);
    } else if (preset === 'tomorrow') {
      const t = new Date(now);
      t.setDate(t.getDate() + 1);
      from = startOf(t);
      to = endOf(t);
    } else if (preset === 'range' && fromRaw && toRaw) {
      from = startOf(new Date(fromRaw));
      to = endOf(new Date(toRaw));
    }
    const createdWhere = { createdAt: { gte: from, lte: to } };
    const dueWhere = { dueDate: { gte: from, lte: to } };
    const [open, unassigned, inProgress, resolved, created, due] = await Promise.all([
      this.prisma.supportTicket.count({
        where: { status: { in: ['open', 'assigned', 'in_progress', 'waiting_on_employee', 'reopened'] } },
      }),
      this.prisma.supportTicket.count({ where: { assignedToId: null, status: { notIn: ['resolved', 'closed'] } } }),
      this.prisma.supportTicket.count({ where: { status: 'in_progress' } }),
      this.prisma.supportTicket.count({ where: { status: 'resolved', resolvedAt: { gte: from, lte: to } } }),
      this.prisma.supportTicket.count({ where: createdWhere }),
      this.prisma.supportTicket.count({ where: dueWhere }),
    ]);
    return { from, to, preset: preset ?? 'today', open, unassigned, inProgress, resolved, created, due };
  }

  /** Actionable items for the dashboard "needs attention" panel. */
  @Roles(...ESTATE_ROLES)
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
        href: '/maintenance?filters[0][field]=staleDays&filters[0][operator]=eq&filters[0][value]=14',
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

  /**
   * Employee "My IT" home: their own assets and their own open tickets — never estate-wide
   * numbers. Scoped server-side (not just hidden in the UI) so a non-IT client can't pull full
   * dashboard data by calling the estate endpoints directly.
   */
  @Get('my-summary')
  async mySummary(@CurrentUser() actor: AuthUser) {
    if (!actor.employeeId) {
      return { assets: [], openTickets: [], openTicketCount: 0 };
    }
    const OPEN = ['open', 'assigned', 'in_progress', 'waiting_on_employee', 'reopened'] as const;
    const [assets, openTickets] = await Promise.all([
      this.prisma.asset.findMany({
        where: { assignedEmployeeId: actor.employeeId },
        select: {
          id: true,
          assetCode: true,
          brand: true,
          model: true,
          status: true,
          category: { select: { name: true } },
        },
        orderBy: { assetCode: 'asc' },
      }),
      this.prisma.supportTicket.findMany({
        where: { raisedById: actor.employeeId, status: { in: [...OPEN] } },
        select: { id: true, ticketNumber: true, subject: true, status: true, priority: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);
    return {
      assets: assets.map((a) => ({
        id: a.id,
        assetCode: a.assetCode,
        brand: a.brand,
        model: a.model,
        status: a.status,
        category: a.category?.name,
      })),
      openTickets,
      openTicketCount: openTickets.length,
    };
  }

  /**
   * Manager home: their team's pending approvals, the team's open tickets, and the team's
   * device count — scoped to direct reports only, never the full estate.
   */
  @Roles(RoleName.MANAGER)
  @Get('team-summary')
  async teamSummary(@CurrentUser() actor: AuthUser) {
    if (!actor.employeeId) {
      return { pendingRequestCount: 0, teamOpenTicketCount: 0, teamDeviceCount: 0, reports: [] };
    }
    const reports = await this.prisma.employee.findMany({
      where: { managerId: actor.employeeId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
    const reportIds = reports.map((r) => r.id);
    const OPEN = ['open', 'assigned', 'in_progress', 'waiting_on_employee', 'reopened'] as const;
    const [pendingRequestCount, teamOpenTicketCount, teamDeviceCount] = await Promise.all([
      this.prisma.assetRequest.count({
        where: { requesterId: { in: reportIds.length ? reportIds : [-1] }, status: 'pending' },
      }),
      this.prisma.supportTicket.count({
        where: { raisedById: { in: reportIds.length ? reportIds : [-1] }, status: { in: [...OPEN] } },
      }),
      this.prisma.asset.count({
        where: { assignedEmployeeId: { in: reportIds.length ? reportIds : [-1] } },
      }),
    ]);
    return {
      pendingRequestCount,
      teamOpenTicketCount,
      teamDeviceCount,
      reports: reports.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}` })),
    };
  }
}
