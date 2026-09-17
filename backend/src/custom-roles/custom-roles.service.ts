import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ALL_PERMISSION_KEYS, type PermissionKey } from '../common/rbac/permissions';
import { RbacService } from '../common/rbac/rbac.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomRoleDto, UpdateCustomRoleDto } from './dto';

@Injectable()
export class CustomRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rbac: RbacService,
  ) {}

  listPermissionCatalog() {
    return ALL_PERMISSION_KEYS;
  }

  async list(actor: AuthUser) {
    const rows = await this.prisma.customRole.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { label: 'asc' },
      include: { permissions: { select: { key: true } } },
    });
    return rows.map((r) => this.present(r));
  }

  async create(dto: CreateCustomRoleDto, actor: AuthUser) {
    this.assertValidPermissions(dto.permissions);
    const key = dto.key.toLowerCase();
    try {
      const row = await this.prisma.customRole.create({
        data: {
          tenantId: actor.tenantId,
          key,
          label: dto.label.trim(),
          description: dto.description?.trim() || null,
          permissions: {
            connect: dto.permissions.map((k) => ({ key: k })),
          },
        },
        include: { permissions: { select: { key: true } } },
      });
      await this.rbac.refreshFromDatabase();
      await this.audit.record({
        entityType: 'CustomRole',
        entityId: row.id,
        action: 'create',
        summary: `Created custom role ${row.label} (${row.key})`,
        changedById: actor.id,
        newValue: { key: row.key, permissions: dto.permissions },
      });
      return this.present(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException(`A custom role with key "${key}" already exists`);
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdateCustomRoleDto, actor: AuthUser) {
    const before = await this.prisma.customRole.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: { permissions: { select: { key: true } } },
    });
    if (!before) throw new NotFoundException();
    if (dto.permissions) this.assertValidPermissions(dto.permissions);
    const row = await this.prisma.customRole.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.permissions
          ? {
              permissions: {
                set: dto.permissions.map((k) => ({ key: k })),
              },
            }
          : {}),
      },
      include: { permissions: { select: { key: true } } },
    });
    await this.rbac.refreshFromDatabase();
    await this.audit.record({
      entityType: 'CustomRole',
      entityId: id,
      action: 'update',
      summary: `Updated custom role ${row.label}`,
      changedById: actor.id,
      oldValue: {
        label: before.label,
        isActive: before.isActive,
        permissions: before.permissions.map((p) => p.key),
      },
      newValue: {
        label: row.label,
        isActive: row.isActive,
        permissions: row.permissions.map((p) => p.key),
      },
    });
    return this.present(row);
  }

  async remove(id: number, actor: AuthUser) {
    const row = await this.prisma.customRole.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!row) throw new NotFoundException();
    const inUse = await this.prisma.user.count({ where: { customRoleId: id } });
    if (inUse > 0) {
      throw new BadRequestException('Cannot delete a custom role that is still assigned to users');
    }
    await this.prisma.customRole.delete({ where: { id } });
    await this.rbac.refreshFromDatabase();
    await this.audit.record({
      entityType: 'CustomRole',
      entityId: id,
      action: 'delete',
      summary: `Deleted custom role ${row.label} (${row.key})`,
      changedById: actor.id,
      oldValue: { key: row.key, label: row.label },
    });
    return { success: true };
  }

  private assertValidPermissions(keys: PermissionKey[]) {
    const allowed = new Set(ALL_PERMISSION_KEYS);
    for (const k of keys) {
      if (!allowed.has(k)) throw new BadRequestException(`Unknown permission: ${k}`);
    }
  }

  private present(row: {
    id: number;
    key: string;
    label: string;
    description: string | null;
    isActive: boolean;
    permissions: { key: string }[];
  }) {
    return {
      id: row.id,
      key: row.key,
      label: row.label,
      description: row.description,
      isActive: row.isActive,
      permissions: row.permissions.map((p) => p.key),
    };
  }
}
