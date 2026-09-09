import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';

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

  async list(query: ListQuery & { locationId?: string; departmentId?: string }) {
    const { skip, take, orderBy } = parseListQuery(query, [
      'id',
      'employeeCode',
      'firstName',
      'lastName',
      'email',
    ]);
    const where: Prisma.EmployeeWhereInput = {
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

  async get(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    return employee;
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
    const before = await this.get(id);
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
    const employee = await this.prisma.employee.delete({ where: { id } });
    await this.audit.record({
      entityType: 'Employee',
      entityId: id,
      action: 'delete',
      summary: `Deleted employee ${employee.employeeCode}`,
      changedById: actor.id,
      oldValue: employee,
    });
    return employee;
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
