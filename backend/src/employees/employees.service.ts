import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus, Prisma, RoleName } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, OffboardEmployeeDto, UpdateEmployeeDto } from './dto';

export interface EmployeeHistoryEvent {
  id: string;
  at: string;
  kind: string;
  summary: string;
  detail?: string;
  href?: string;
}

const employeeInclude = {
  department: true,
  location: true,
  manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
} satisfies Prisma.EmployeeInclude;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    query: ListQuery & { locationId?: string; departmentId?: string },
    actor: AuthUser,
  ) {
    const { skip, take, orderBy } = parseListQuery(query, [
      'id',
      'employeeCode',
      'firstName',
      'lastName',
      'email',
    ]);
    const where: Prisma.EmployeeWhereInput = {
      ...this.listScopeWhere(actor),
      ...(query.locationId ? { locationId: Number(query.locationId) } : {}),
      ...(query.departmentId ? { departmentId: Number(query.departmentId) } : {}),
      ...(query.q
        ? {
            OR: [
              { firstName: { contains: query.q, mode: 'insensitive' } },
              { lastName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { employeeCode: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({ where, skip, take, orderBy, include: employeeInclude }),
      this.prisma.employee.count({ where }),
    ]);
    return { data, total };
  }

  /** Employee profile: the employee plus every asset currently assigned to them (single query, no N+1). */
  async profile(id: number, actor: AuthUser) {
    await this.assertCanViewEmployee(actor, id);
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        ...employeeInclude,
        assignedAssets: {
          include: { category: true, location: true },
          orderBy: { assetCode: 'asc' },
        },
        accessoryCheckouts: {
          where: { checkedInAt: null },
          include: { accessory: true },
          orderBy: { checkedOutAt: 'desc' },
        },
        consumableIssues: {
          include: { consumable: true },
          orderBy: { issuedAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    return employee;
  }

  async get(id: number, actor: AuthUser) {
    await this.assertCanViewEmployee(actor, id);
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    return employee;
  }

  async history(id: number, actor: AuthUser): Promise<EmployeeHistoryEvent[]> {
    await this.assertCanViewEmployee(actor, id);
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true, employeeCode: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    const [
      assignments,
      transfersFrom,
      transfersTo,
      checkouts,
      issues,
      requests,
      auditRows,
    ] = await Promise.all([
      this.prisma.assetAssignment.findMany({
        where: { employeeId: id },
        include: { asset: { select: { id: true, assetCode: true } } },
        orderBy: { assignedAt: 'desc' },
        take: 100,
      }),
      this.prisma.assetTransfer.findMany({
        where: { fromEmployeeId: id },
        include: { asset: { select: { id: true, assetCode: true } } },
        orderBy: { transferredAt: 'desc' },
        take: 50,
      }),
      this.prisma.assetTransfer.findMany({
        where: { toEmployeeId: id },
        include: { asset: { select: { id: true, assetCode: true } } },
        orderBy: { transferredAt: 'desc' },
        take: 50,
      }),
      this.prisma.accessoryCheckout.findMany({
        where: { employeeId: id },
        include: { accessory: { select: { id: true, name: true } } },
        orderBy: { checkedOutAt: 'desc' },
        take: 100,
      }),
      this.prisma.consumableIssue.findMany({
        where: { employeeId: id },
        include: { consumable: { select: { id: true, name: true } } },
        orderBy: { issuedAt: 'desc' },
        take: 100,
      }),
      this.prisma.assetRequest.findMany({
        where: { requesterId: id },
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.auditLog.findMany({
        where: {
          OR: [
            { entityType: 'Employee', entityId: String(id) },
            { summary: { contains: employee.employeeCode, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const events: EmployeeHistoryEvent[] = [];

    for (const a of assignments) {
      events.push({
        id: `assign-${a.id}`,
        at: a.assignedAt.toISOString(),
        kind: a.returnedAt ? 'Asset assignment (closed)' : 'Asset assignment',
        summary: a.returnedAt
          ? `Assigned ${a.asset.assetCode} (returned ${a.returnedAt.toLocaleDateString()})`
          : `Assigned ${a.asset.assetCode}`,
        detail: a.notes ?? undefined,
        href: `/assets/show/${a.asset.id}`,
      });
    }

    for (const t of [...transfersFrom, ...transfersTo]) {
      const direction = t.fromEmployeeId === id ? 'from' : 'to';
      events.push({
        id: `transfer-${t.id}-${direction}`,
        at: t.transferredAt.toISOString(),
        kind: 'Asset transfer',
        summary: `${direction === 'from' ? 'Transferred' : 'Received'} ${t.asset.assetCode}`,
        detail: t.reason ?? undefined,
        href: `/assets/show/${t.asset.id}`,
      });
    }

    for (const c of checkouts) {
      events.push({
        id: `checkout-${c.id}`,
        at: c.checkedOutAt.toISOString(),
        kind: 'Accessory checkout',
        summary: `Checked out ${c.quantity}× ${c.accessory.name}`,
        href: `/accessories`,
      });
      if (c.checkedInAt) {
        events.push({
          id: `checkin-${c.id}`,
          at: c.checkedInAt.toISOString(),
          kind: 'Accessory check-in',
          summary: `Checked in ${c.quantity}× ${c.accessory.name}`,
          href: `/accessories`,
        });
      }
    }

    for (const i of issues) {
      events.push({
        id: `issue-${i.id}`,
        at: i.issuedAt.toISOString(),
        kind: 'Consumable issue',
        summary: `Issued ${i.quantity}× ${i.consumable.name}`,
        href: `/consumables`,
      });
    }

    for (const r of requests) {
      events.push({
        id: `request-${r.id}`,
        at: r.createdAt.toISOString(),
        kind: 'Asset request',
        summary: `${r.kind === 'asset' ? r.category?.name ?? 'Asset' : r.accessoryName ?? 'Accessory'} — ${r.status}`,
        detail: r.reason,
        href: `/requests`,
      });
    }

    for (const row of auditRows) {
      events.push({
        id: `audit-${row.id}`,
        at: row.createdAt.toISOString(),
        kind: 'Audit',
        summary: row.summary,
      });
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return events.slice(0, 200);
  }

  async offboard(id: number, dto: OffboardEmployeeDto, actor: AuthUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        assignedAssets: { select: { id: true, assetCode: true, status: true } },
        accessoryCheckouts: { where: { checkedInAt: null }, include: { accessory: true } },
        user: { select: { id: true } },
      },
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    if (!employee.isActive) {
      throw new BadRequestException(`${employee.employeeCode} is already inactive`);
    }
    if (dto.reassignAssetsToId && dto.returnAssets === false) {
      const target = await this.prisma.employee.findUnique({
        where: { id: dto.reassignAssetsToId },
      });
      if (!target?.isActive) {
        throw new BadRequestException('Reassign target employee not found or inactive');
      }
    }

    const returnToPool = dto.reassignAssetsToId ? false : dto.returnAssets !== false;

    const result = await this.prisma.$transaction(async (tx) => {
      for (const asset of employee.assignedAssets) {
        await tx.assetAssignment.updateMany({
          where: { assetId: asset.id, returnedAt: null },
          data: { returnedAt: new Date() },
        });
        if (returnToPool) {
          await tx.asset.update({
            where: { id: asset.id },
            data: { status: 'available' as AssetStatus, assignedEmployeeId: null },
          });
        } else if (dto.reassignAssetsToId) {
          await tx.assetAssignment.create({
            data: {
              assetId: asset.id,
              employeeId: dto.reassignAssetsToId,
              assignedById: actor.id,
              notes: dto.notes,
            },
          });
          await tx.asset.update({
            where: { id: asset.id },
            data: { assignedEmployeeId: dto.reassignAssetsToId, status: 'assigned' as AssetStatus },
          });
        }
      }

      for (const checkout of employee.accessoryCheckouts) {
        await tx.accessoryCheckout.update({
          where: { id: checkout.id },
          data: { checkedInAt: new Date() },
        });
        await tx.accessory.update({
          where: { id: checkout.accessoryId },
          data: { quantityCheckedOut: { decrement: checkout.quantity } },
        });
      }

      const updated = await tx.employee.update({
        where: { id },
        data: { isActive: false },
        include: employeeInclude,
      });

      if (employee.user) {
        await tx.user.update({
          where: { id: employee.user.id },
          data: { isActive: false },
        });
      }

      await this.audit.record(
        {
          entityType: 'Employee',
          entityId: id,
          action: 'update',
          summary: `Offboarded ${employee.employeeCode}${dto.notes ? ` — ${dto.notes}` : ''}`,
          changedById: actor.id,
          oldValue: { isActive: true, assignedAssets: employee.assignedAssets.length },
          newValue: {
            isActive: false,
            assetsReturned: returnToPool ? employee.assignedAssets.length : 0,
            assetsReassigned: dto.reassignAssetsToId ? employee.assignedAssets.length : 0,
            accessoriesCheckedIn: employee.accessoryCheckouts.length,
          },
        },
        tx,
      );

      return updated;
    });

    return result;
  }

  async create(dto: CreateEmployeeDto, actor: AuthUser) {
    const employee = await this.prisma.employee.create({
      data: {
        employeeCode: dto.employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        designation: dto.designation,
        locationId: dto.locationId,
        departmentId: dto.departmentId ?? null,
        managerId: dto.managerId ?? null,
        dateJoined: dto.dateJoined ? new Date(dto.dateJoined) : null,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      entityType: 'Employee',
      entityId: employee.id,
      action: 'create',
      summary: `Created employee ${employee.employeeCode} (${employee.firstName} ${employee.lastName})`,
      changedById: actor.id,
      newValue: employee,
    });
    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDto, actor: AuthUser) {
    const before = await this.get(id, actor);
    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email ? dto.email.toLowerCase() : undefined,
        dateJoined: dto.dateJoined ? new Date(dto.dateJoined) : undefined,
      },
    });
    await this.audit.record({
      entityType: 'Employee',
      entityId: id,
      action: 'update',
      summary: `Updated employee ${employee.employeeCode}`,
      changedById: actor.id,
      oldValue: before,
      newValue: employee,
    });
    return employee;
  }

  async remove(id: number, actor: AuthUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignedAssets: true,
            assignments: true,
            accessoryCheckouts: true,
            consumableIssues: true,
            assetRequests: true,
          },
        },
      },
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    const hasHistory =
      employee._count.assignments > 0 ||
      employee._count.accessoryCheckouts > 0 ||
      employee._count.consumableIssues > 0 ||
      employee._count.assetRequests > 0;
    if (hasHistory || employee._count.assignedAssets > 0) {
      throw new BadRequestException(
        'Cannot delete an employee with asset or inventory history. Offboard them instead — history is preserved.',
      );
    }
    const deleted = await this.prisma.employee.delete({ where: { id } });
    await this.audit.record({
      entityType: 'Employee',
      entityId: id,
      action: 'delete',
      summary: `Deleted employee ${deleted.employeeCode}`,
      changedById: actor.id,
      oldValue: deleted,
    });
    return deleted;
  }

  private listScopeWhere(actor: AuthUser): Prisma.EmployeeWhereInput {
    if (
      actor.role === RoleName.SUPER_ADMIN ||
      actor.role === RoleName.IT_ADMIN ||
      actor.role === RoleName.IT_SUPPORT
    ) {
      return {};
    }
    if (actor.role === RoleName.EMPLOYEE && actor.employeeId) {
      return { id: actor.employeeId };
    }
    if (actor.role === RoleName.MANAGER && actor.employeeId) {
      return {
        OR: [{ id: actor.employeeId }, { managerId: actor.employeeId }],
      };
    }
    return { id: -1 };
  }

  private async assertCanViewEmployee(actor: AuthUser, employeeId: number) {
    if (
      actor.role === RoleName.SUPER_ADMIN ||
      actor.role === RoleName.IT_ADMIN ||
      actor.role === RoleName.IT_SUPPORT
    ) {
      return;
    }
    if (actor.role === RoleName.EMPLOYEE && actor.employeeId !== employeeId) {
      throw new ForbiddenException('You can only view your own profile');
    }
    if (actor.role === RoleName.MANAGER && actor.employeeId !== employeeId) {
      const emp = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { managerId: true },
      });
      if (!emp || emp.managerId !== actor.employeeId) {
        throw new ForbiddenException('You can only view your direct reports');
      }
    }
  }
}
