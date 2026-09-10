import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import * as crypto from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { AdminResetPasswordDto, CreateUserDto, UpdateUserDto } from './dto';

/**
 * Settings → Users (Super Admin only). Closes the "documented but missing" user-management gap
 * (permissions.ts has `user:manage`, Help describes it, but no CRUD existed) and is also where
 * "create a login for this employee" (B2) lands.
 */
@ApiTags('users')
@Controller('users')
@Roles(RoleName.SUPER_ADMIN)
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list(@Query() query: ListQuery) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'email', 'fullName']);
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy,
        include: { role: true, employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.user.count(),
    ]);
    return {
      data: data.map((u) => this.present(u)),
      total,
    };
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { role: true, employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });
    return this.present(u);
  }

  /** Create a standalone login, or link one to an existing employee (email/reset-link only — no plaintext password stored or returned). */
  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: number) {
    const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
    if (!role) throw new BadRequestException(`Unknown role ${dto.role}`);
    if (dto.employeeId) {
      const existing = await this.prisma.user.findUnique({ where: { employeeId: dto.employeeId } });
      if (existing) throw new BadRequestException('This employee already has a login');
    }
    // A random, never-communicated placeholder — the real password is set via the emailed link.
    const placeholder = dto.password ?? crypto.randomBytes(24).toString('hex');
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash: await AuthService.hashPassword(placeholder),
        roleId: role.id,
        employeeId: dto.employeeId ?? null,
      },
      include: { role: true, employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });
    if (!dto.password) {
      await this.authService.sendSetPasswordLink(user.id, user.email, {
        subject: 'Set your NewVision password',
        intro: `An IT Admin created a NewVision login for you (${dto.role.replaceAll('_', ' ')}). Set your password using the link below.`,
      });
    }
    await this.audit.record({
      entityType: 'User',
      entityId: user.id,
      action: 'create',
      summary: `Created login ${user.email} (${dto.role})`,
      changedById: actorId,
      newValue: { email: user.email, role: dto.role, employeeId: dto.employeeId },
    });
    return this.present(user);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') actorId: number,
  ) {
    const before = await this.prisma.user.findUniqueOrThrow({ where: { id }, include: { role: true } });
    let roleId: number | undefined;
    if (dto.role) {
      const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
      if (!role) throw new BadRequestException(`Unknown role ${dto.role}`);
      roleId = role.id;
    }
    if (dto.employeeId) {
      const existing = await this.prisma.user.findUnique({ where: { employeeId: dto.employeeId } });
      if (existing && existing.id !== id) throw new BadRequestException('This employee already has a login');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(roleId !== undefined ? { roleId } : {}),
        ...(dto.employeeId !== undefined ? { employeeId: dto.employeeId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { role: true, employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });
    await this.audit.record({
      entityType: 'User',
      entityId: id,
      action: 'update',
      summary: `Updated login ${user.email}${dto.isActive === false ? ' (deactivated)' : dto.isActive === true ? ' (activated)' : ''}`,
      changedById: actorId,
      oldValue: { role: before.role.name, isActive: before.isActive },
      newValue: { role: user.role.name, isActive: user.isActive },
    });
    return this.present(user);
  }

  /** Super Admin-initiated reset: emails a set-password link (or, if a password is given, sets it directly). */
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminResetPasswordDto,
    @CurrentUser('id') actorId: number,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (dto.password) {
      await this.prisma.user.update({
        where: { id },
        data: { passwordHash: await AuthService.hashPassword(dto.password) },
      });
    } else {
      await this.authService.sendSetPasswordLink(user.id, user.email, {
        subject: 'Reset your NewVision password',
        intro: 'An IT Admin reset your NewVision password. Set a new one using the link below.',
      });
    }
    await this.audit.record({
      entityType: 'User',
      entityId: id,
      action: 'manual_override',
      summary: `Password reset for ${user.email}`,
      changedById: actorId,
    });
    return { success: true };
  }

  private present(u: {
    id: number;
    email: string;
    fullName: string;
    isActive: boolean;
    createdAt: Date;
    role: { name: RoleName };
    employee: { id: number; firstName: string; lastName: string; employeeCode: string } | null;
  }) {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      isActive: u.isActive,
      role: u.role.name,
      employee: u.employee,
      createdAt: u.createdAt,
    };
  }
}
