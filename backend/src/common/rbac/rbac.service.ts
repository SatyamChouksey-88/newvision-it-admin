import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { runUnscoped } from '../../tenancy/context';
import {
  PermissionKey,
  ROLE_PERMISSIONS,
  permissionsForRole,
  setRuntimeCustomRolePermissions,
  setRuntimeRolePermissions,
} from './permissions';

/**
 * Phase 5 (sub-step 1) — load the five system roles' permission sets from the database
 * (seeded from ROLE_PERMISSIONS) and wire them into the static `can()` helper.
 */
@Injectable()
export class RbacService implements OnModuleInit {
  private readonly logger = new Logger(RbacService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshFromDatabase();
  }

  async refreshFromDatabase() {
    const roles = await runUnscoped(() =>
      this.prisma.role.findMany({
        include: { permissions: { select: { key: true } } },
      }),
    );
    const matrix: Record<RoleName, PermissionKey[]> = { ...ROLE_PERMISSIONS };
    for (const role of roles) {
      if (!role.name) continue;
      matrix[role.name] = role.permissions.map((p) => p.key as PermissionKey);
    }
    for (const name of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
      const loaded = matrix[name];
      const expected = ROLE_PERMISSIONS[name];
      const same =
        loaded.length === expected.length && expected.every((k) => loaded.includes(k));
      if (!same) {
        this.logger.warn(
          `Role ${name} permissions in DB differ from ROLE_PERMISSIONS defaults — using DB as runtime source`,
        );
      }
    }
    setRuntimeRolePermissions(matrix);

    const customs = await runUnscoped(() =>
      this.prisma.customRole.findMany({
        where: { isActive: true },
        include: { permissions: { select: { key: true } } },
      }),
    );
    const customMap = new Map<number, PermissionKey[]>();
    for (const cr of customs) {
      customMap.set(
        cr.id,
        cr.permissions.map((p) => p.key as PermissionKey),
      );
    }
    setRuntimeCustomRolePermissions(customMap);
  }

  getPermissionsForRole(role: RoleName): PermissionKey[] {
    return permissionsForRole(role);
  }
}
