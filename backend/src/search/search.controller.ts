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
      return { assets: [], employees: [], locations: [], tickets: [], query: term };
    }
    const like = { contains: term, mode: 'insensitive' as const };
    const isIt = IT_ROLES.includes(user.role);
    const ticketId = /^#?\d+$/.test(term) ? Number(term.replace('#', '')) : undefined;

    const [assets, employees, locations, tickets] = await Promise.all([
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
    ]);

    return { query: term, assets, employees, locations, tickets };
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
