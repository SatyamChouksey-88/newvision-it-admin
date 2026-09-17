import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../rbac/permissions';

export const PERMISSIONS_KEY = 'permissions';

export type PermissionRequirement = {
  keys: PermissionKey[];
  /** Default `any`: user needs at least one listed permission. */
  mode?: 'any' | 'all';
};

/** Explicit permission gate (used alone or with {@link Roles}). */
export const RequirePermissions = (
  ...keys: PermissionKey[]
): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSIONS_KEY, { keys, mode: 'any' } satisfies PermissionRequirement);

export const RequireAllPermissions = (
  ...keys: PermissionKey[]
): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSIONS_KEY, { keys, mode: 'all' } satisfies PermissionRequirement);
