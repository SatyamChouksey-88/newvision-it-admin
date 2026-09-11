import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma, RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const IT_ROLES: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT];

/**
 * Global search across asset code, serial number, employee name/ID, model, location and
 * repair tickets. Results are scoped with the same visibility rules as the list endpoints,
 * so an employee only ever sees their own assets/profile and a manager their team.
 */
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(@Query('q') q: string | undefined, @CurrentUser() user: AuthUser) {
    const term = (q ?? '').trim();
    if (term.length < 1) {
      return {
        assets: [],
        employees: [],
        locations: [],
        tickets: [],
        helpdesk: [],
        accessories: [],
        consumables: [],
        requests: [],
        vendors: [],
        requisitions: [],
        purchaseOrders: [],
        query: term,
      };
    }
    const like = { contains: term, mode: 'insensitive' as const };
    const isIt = IT_ROLES.includes(user.role);
    const ticketId = /^#?\d+$/.test(term) ? Number(term.replace('#', '')) : undefined;

    const isProc =
      user.role === RoleName.SUPER_ADMIN ||
      user.role === RoleName.IT_ADMIN ||
      user.role === RoleName.MANAGER;

    const [
      assets,
      employees,
      locations,
      tickets,
      helpdesk,
      accessories,
      consumables,
      requests,
      vendors,
      requisitions,
      purchaseOrders,
    ] = await Promise.all([
      this.prisma.asset.findMany({
        where: {
          ...this.assetScope(user),
          OR: [{ assetCode: like }, { serialNumber: like }, { model: like }, { brand: like }],
        },
        include: { category: true, location: true, assignedEmployee: true },
        take: 20,
      }),
      this.prisma.employee.findMany({
        where: {
          ...this.employeeScope(user),
          OR: [{ firstName: like }, { lastName: like }, { email: like }, { employeeCode: like }],
        },
        include: { location: true, department: true },
        take: 20,
      }),
      this.prisma.location.findMany({
        where: { OR: [{ name: like }, { code: like }, { city: like }] },
        take: 10,
      }),
      isIt
        ? this.prisma.assetMaintenance.findMany({
            where: {
              OR: [
                { issue: like },
                { vendor: like },
                { asset: { assetCode: like } },
                ...(ticketId !== undefined ? [{ id: ticketId }] : []),
              ],
            },
            select: {
              id: true,
              issue: true,
              status: true,
              asset: { select: { id: true, assetCode: true } },
            },
            orderBy: { reportedAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
      this.prisma.supportTicket.findMany({
        where: {
          AND: [
            user.role === RoleName.SUPER_ADMIN ||
            user.role === RoleName.IT_ADMIN ||
            user.role === RoleName.IT_SUPPORT
              ? {}
              : user.role === RoleName.MANAGER && user.employeeId
                ? {
                    OR: [
                      { raisedById: user.employeeId },
                      { raisedBy: { managerId: user.employeeId } },
                      { watchers: { some: { employeeId: user.employeeId } } },
                    ],
                  }
                : {
                    OR: [
                      { raisedById: user.employeeId ?? -1 },
                      { watchers: { some: { employeeId: user.employeeId ?? -1 } } },
                    ],
                  },
            {
              OR: [{ ticketNumber: like }, { subject: like }, { description: like }],
            },
          ],
        },
        select: { id: true, ticketNumber: true, subject: true, status: true },
        take: 10,
      }),
      isIt
        ? this.prisma.accessory.findMany({
            where: { OR: [{ name: like }, { category: like }] },
            select: {
              id: true,
              name: true,
              category: true,
              quantityTotal: true,
              quantityCheckedOut: true,
            },
            take: 10,
          })
        : Promise.resolve([]),
      isIt
        ? this.prisma.consumable.findMany({
            where: { OR: [{ name: like }, { category: like }] },
            select: { id: true, name: true, category: true, quantityAvailable: true },
            take: 10,
          })
        : Promise.resolve([]),
      isIt
        ? this.prisma.assetRequest.findMany({
            where: { OR: [{ reason: like }, { accessoryName: like }] },
            select: { id: true, status: true, reason: true, kind: true },
            take: 8,
          })
        : Promise.resolve([]),
      isProc
        ? this.prisma.vendor.findMany({
            where: { OR: [{ legalName: like }, { vendorCode: like }, { tradingName: like }] },
            select: { id: true, vendorCode: true, legalName: true, status: true },
            take: 8,
          })
        : Promise.resolve([]),
      isProc
        ? this.prisma.purchaseRequisition.findMany({
            where: { OR: [{ title: like }, { requisitionNumber: like }] },
            select: { id: true, requisitionNumber: true, title: true, status: true },
            take: 8,
          })
        : Promise.resolve([]),
      user.role === RoleName.SUPER_ADMIN || user.role === RoleName.IT_ADMIN
        ? this.prisma.purchaseOrder.findMany({
            where: { OR: [{ poNumber: like }, { vendor: { legalName: like } }] },
            select: { id: true, poNumber: true, status: true, total: true },
            take: 8,
          })
        : Promise.resolve([]),
    ]);

    return {
      query: term,
      assets,
      employees,
      locations,
      tickets,
      helpdesk,
      accessories,
      consumables,
      requests,
      vendors,
      requisitions,
      purchaseOrders,
    };
  }

  private assetScope(actor: AuthUser): Prisma.AssetWhereInput {
    if (IT_ROLES.includes(actor.role)) return {};
    if (!actor.employeeId) return { id: -1 };
    if (actor.role === RoleName.MANAGER) {
      return {
        assignedEmployee: { OR: [{ managerId: actor.employeeId }, { id: actor.employeeId }] },
      };
    }
    return { assignedEmployeeId: actor.employeeId };
  }

  private employeeScope(actor: AuthUser): Prisma.EmployeeWhereInput {
    if (IT_ROLES.includes(actor.role)) return {};
    if (!actor.employeeId) return { id: -1 };
    if (actor.role === RoleName.MANAGER) {
      return { OR: [{ id: actor.employeeId }, { managerId: actor.employeeId }] };
    }
    return { id: actor.employeeId };
  }
}
