import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus, Prisma, RoleName } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, OffboardEmployeeDto, UpdateEmployeeDto } from './dto';
import * as crypto from 'node:crypto';

export interface EmployeeHistoryEvent {
  id: string;
  at: string;
  kind: string;
  summary: string;
  detail?: string;
  href?: string;
}

export interface EmployeeListQuery extends ListQuery {
  locationId?: string;
  departmentId?: string;
  /** 'true' | 'false' — omit for everyone. */
  isActive?: string;
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
    private readonly authService: AuthService,
  ) {}

  async list(query: EmployeeListQuery, actor: AuthUser) {
    const { skip, take, orderBy } = parseListQuery(query, [
      'id',
      'employeeCode',
      'firstName',
      'lastName',
      'email',
      'designation',
      'isActive',
      'dateJoined',
    ]);
    const where: Prisma.EmployeeWhereInput = {
      ...this.listScopeWhere(actor),
      ...(query.locationId ? { locationId: Number(query.locationId) } : {}),
      ...(query.departmentId ? { departmentId: Number(query.departmentId) } : {}),
      ...(query.isActive === 'true' ? { isActive: true } : {}),
      ...(query.isActive === 'false' ? { isActive: false } : {}),
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
          take: 500,
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

    const HISTORY_TAKE = 500;
    const [assignments, transfersFrom, transfersTo, checkouts, issues, requests, tickets, auditRows] =
      await Promise.all([
        this.prisma.assetAssignment.findMany({
          where: { employeeId: id },
          include: { asset: { select: { id: true, assetCode: true } } },
          orderBy: { assignedAt: 'desc' },
          take: HISTORY_TAKE,
        }),
        this.prisma.assetTransfer.findMany({
          where: { fromEmployeeId: id },
          include: { asset: { select: { id: true, assetCode: true } } },
          orderBy: { transferredAt: 'desc' },
          take: HISTORY_TAKE,
        }),
        this.prisma.assetTransfer.findMany({
          where: { toEmployeeId: id },
          include: { asset: { select: { id: true, assetCode: true } } },
          orderBy: { transferredAt: 'desc' },
          take: HISTORY_TAKE,
        }),
        this.prisma.accessoryCheckout.findMany({
          where: { employeeId: id },
          include: { accessory: { select: { id: true, name: true } } },
          orderBy: { checkedOutAt: 'desc' },
          take: HISTORY_TAKE,
        }),
        this.prisma.consumableIssue.findMany({
          where: { employeeId: id },
          include: { consumable: { select: { id: true, name: true } } },
          orderBy: { issuedAt: 'desc' },
          take: HISTORY_TAKE,
        }),
        this.prisma.assetRequest.findMany({
          where: { requesterId: id },
          include: { category: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: HISTORY_TAKE,
        }),
        this.prisma.assetMaintenance.findMany({
          where: {
            OR: [
              { reportedBy: { employeeId: id } },
              { asset: { assignments: { some: { employeeId: id } } } },
            ],
          },
          include: { asset: { select: { id: true, assetCode: true } } },
          orderBy: { reportedAt: 'desc' },
          take: HISTORY_TAKE,
        }),
        this.prisma.auditLog.findMany({
          where: {
            OR: [
              { entityType: 'Employee', entityId: String(id) },
              { summary: { contains: employee.employeeCode, mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: HISTORY_TAKE,
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

    // A location-only transfer has from === to === this employee and appears in both lists;
    // de-duplicate by transfer id so React keys stay unique and the event is not shown twice.
    const seenTransfers = new Set<number>();
    for (const t of [...transfersFrom, ...transfersTo]) {
      if (seenTransfers.has(t.id)) continue;
      seenTransfers.add(t.id);
      const locationOnly = t.fromEmployeeId === id && t.toEmployeeId === id;
      const direction = locationOnly ? 'moved' : t.fromEmployeeId === id ? 'from' : 'to';
      const verb =
        direction === 'moved' ? 'Moved' : direction === 'from' ? 'Transferred' : 'Received';
      events.push({
        id: `transfer-${t.id}`,
        at: t.transferredAt.toISOString(),
        kind: 'Asset transfer',
        summary: `${verb} ${t.asset.assetCode}`,
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
        summary: `${r.kind === 'asset' ? (r.category?.name ?? 'Asset') : (r.accessoryName ?? 'Accessory')} — ${r.status}`,
        detail: r.reason,
        href: `/requests`,
      });
    }

    for (const t of tickets) {
      events.push({
        id: `maint-${t.id}`,
        at: t.reportedAt.toISOString(),
        kind: 'Maintenance',
        summary: `${t.asset.assetCode}: ${t.issue}`,
        detail: t.status,
        href: `/assets/show/${t.asset.id}`,
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
    return events;
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
    if (dto.reassignAssetsToId) {
      if (dto.reassignAssetsToId === id) {
        throw new BadRequestException('Cannot reassign assets to the employee being offboarded');
      }
      const target = await this.prisma.employee.findUnique({
        where: { id: dto.reassignAssetsToId },
      });
      if (!target?.isActive) {
        throw new BadRequestException('Reassign target employee not found or inactive');
      }
    }

    const returnToPool = dto.reassignAssetsToId ? false : dto.returnAssets !== false;
    const target = dto.reassignAssetsToId
      ? await this.prisma.employee.findUnique({
          where: { id: dto.reassignAssetsToId },
          select: { firstName: true, lastName: true, employeeCode: true },
        })
      : null;

    const result = await this.prisma.$transaction(async (tx) => {
      for (const asset of employee.assignedAssets) {
        await tx.assetAssignment.updateMany({
          where: { assetId: asset.id, returnedAt: null },
          data: { returnedAt: new Date() },
        });
        // An asset in the repair shop stays `under_repair` (the ticket flow returns it to the pool);
        // we only detach it from the leaver so nothing is left pointing at a departed employee.
        const inRepair = asset.status === 'under_repair';
        let newStatus: AssetStatus = asset.status;
        if (returnToPool) {
          newStatus = inRepair ? asset.status : ('available' as AssetStatus);
          await tx.asset.update({
            where: { id: asset.id },
            data: { status: newStatus, assignedEmployeeId: null },
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
          newStatus = inRepair ? asset.status : ('assigned' as AssetStatus);
          await tx.asset.update({
            where: { id: asset.id },
            data: { assignedEmployeeId: dto.reassignAssetsToId, status: newStatus },
          });
        }
        await this.audit.record(
          {
            entityType: 'Asset',
            entityId: asset.id,
            action: returnToPool ? 'status_change' : 'assign',
            summary: returnToPool
              ? `Returned ${asset.assetCode} on offboarding of ${employee.employeeCode}`
              : `Reassigned ${asset.assetCode} to ${target?.firstName ?? ''} ${target?.lastName ?? ''} (${target?.employeeCode ?? dto.reassignAssetsToId}) on offboarding of ${employee.employeeCode}`,
            changedById: actor.id,
            oldValue: { status: asset.status, assignedEmployeeId: id },
            newValue: {
              status: newStatus,
              assignedEmployeeId: returnToPool ? null : dto.reassignAssetsToId,
            },
          },
          tx,
        );
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
        await this.audit.record(
          {
            entityType: 'Accessory',
            entityId: checkout.accessoryId,
            action: 'checkin',
            summary: `Checked in ${checkout.quantity}× ${checkout.accessory.name} on offboarding of ${employee.employeeCode}`,
            changedById: actor.id,
            newValue: { checkoutId: checkout.id },
          },
          tx,
        );
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

  /** Rehire: set the employee active again and re-enable their login. History is untouched. */
  async reinstate(id: number, actor: AuthUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    if (employee.isActive) {
      throw new BadRequestException(`${employee.employeeCode} is already active`);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id },
        data: { isActive: true },
        include: employeeInclude,
      });
      if (employee.user) {
        await tx.user.update({ where: { id: employee.user.id }, data: { isActive: true } });
      }
      await this.audit.record(
        {
          entityType: 'Employee',
          entityId: id,
          action: 'update',
          summary: `Reinstated ${employee.employeeCode}`,
          changedById: actor.id,
          oldValue: { isActive: false },
          newValue: { isActive: true },
        },
        tx,
      );
      return updated;
    });
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

    // B2: creating an employee doesn't automatically create a login — this is the optional
    // "Create a login for this employee" step, wired to the same user-creation path Settings →
    // Users uses (a set-your-own-password email link, never a plaintext temp password).
    if (dto.createLogin) {
      const role = await this.prisma.role.findUnique({
        where: { name: dto.loginRole ?? RoleName.EMPLOYEE },
      });
      if (role) {
        const user = await this.prisma.user.create({
          data: {
            email: employee.email,
            fullName: `${employee.firstName} ${employee.lastName}`,
            passwordHash: await AuthService.hashPassword(crypto.randomBytes(24).toString('hex')),
            roleId: role.id,
            employeeId: employee.id,
          },
        });
        await this.authService.sendSetPasswordLink(user.id, user.email, {
          subject: 'Set your NewVision password',
          intro: `IT created a NewVision login for you (${(dto.loginRole ?? RoleName.EMPLOYEE).replaceAll('_', ' ')}). Set your password using the link below.`,
        });
        await this.audit.record({
          entityType: 'User',
          entityId: user.id,
          action: 'create',
          summary: `Created login ${user.email} for new employee ${employee.employeeCode}`,
          changedById: actor.id,
        });
      }
    }

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
