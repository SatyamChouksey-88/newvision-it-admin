import { RoleName } from '@prisma/client';

/**
 * Permission keys used across the app. Format: "<subject>:<action>".
 * These back the `permissions` table (seeded) and the `can()` helper below,
 * which is also what the API-layer guards conceptually enforce.
 */
export type PermissionKey =
  | 'asset:read'
  | 'asset:create'
  | 'asset:update'
  | 'asset:delete'
  | 'asset:assign'
  | 'asset:transfer'
  | 'asset:retire'
  | 'asset:import'
  | 'asset:export'
  | 'maintenance:read'
  | 'maintenance:manage'
  | 'employee:read'
  | 'employee:manage'
  | 'location:manage'
  | 'department:manage'
  | 'category:manage'
  | 'report:run'
  | 'audit:read'
  | 'user:manage'
  | 'request:approve'
  | 'issue:report'
  | 'asset:request'
  | 'ticket:manage'
  | 'procurement:manage'
  | 'procurement:request';

/** Every permission key in the product — used for custom-role checklists. */
export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  'asset:read',
  'asset:create',
  'asset:update',
  'asset:delete',
  'asset:assign',
  'asset:transfer',
  'asset:retire',
  'asset:import',
  'asset:export',
  'maintenance:read',
  'maintenance:manage',
  'employee:read',
  'employee:manage',
  'location:manage',
  'department:manage',
  'category:manage',
  'report:run',
  'audit:read',
  'user:manage',
  'request:approve',
  'issue:report',
  'asset:request',
  'ticket:manage',
  'procurement:manage',
  'procurement:request',
];

const ALL: PermissionKey[] = ALL_PERMISSION_KEYS;

/** Role → permission matrix. Single source of truth for RBAC. */
export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  SUPER_ADMIN: ALL,
  IT_ADMIN: [
    'asset:read',
    'asset:create',
    'asset:update',
    'asset:assign',
    'asset:transfer',
    'asset:retire',
    'asset:import',
    'asset:export',
    'maintenance:read',
    'maintenance:manage',
    'employee:read',
    'employee:manage',
    'location:manage',
    'department:manage',
    'category:manage',
    'report:run',
    'audit:read',
    'request:approve',
    'issue:report',
    'asset:request',
    'ticket:manage',
    'procurement:manage',
    'procurement:request',
  ],
  IT_SUPPORT: [
    'asset:read',
    'maintenance:read',
    'maintenance:manage',
    'employee:read',
    'report:run',
    'ticket:manage',
  ],
  MANAGER: ['asset:read', 'employee:read', 'request:approve', 'report:run', 'procurement:request'],
  EMPLOYEE: ['asset:read', 'issue:report', 'asset:request'],
};

/** Seeded defaults; used until {@link setRuntimeRolePermissions} runs (Phase 5 sub-step 1). */
let runtimeRolePermissions: Record<RoleName, PermissionKey[]> | null = null;
let runtimeCustomRolePermissions: Map<number, PermissionKey[]> | null = null;

/** Called by RbacService after loading role/permission rows from the database. */
export function setRuntimeRolePermissions(matrix: Record<RoleName, PermissionKey[]>) {
  runtimeRolePermissions = matrix;
}

export function clearRuntimeRolePermissions() {
  runtimeRolePermissions = null;
  runtimeCustomRolePermissions = null;
}

export function setRuntimeCustomRolePermissions(map: Map<number, PermissionKey[]>) {
  runtimeCustomRolePermissions = map;
}

function effectiveMatrix(): Record<RoleName, PermissionKey[]> {
  return runtimeRolePermissions ?? ROLE_PERMISSIONS;
}

export function permissionsForRole(role: RoleName): PermissionKey[] {
  return effectiveMatrix()[role] ?? [];
}

export function permissionsForCustomRole(customRoleId: number): PermissionKey[] {
  return runtimeCustomRolePermissions?.get(customRoleId) ?? [];
}

/** Effective permission set for a signed-in user (custom role overrides system role permissions). */
export function effectivePermissions(
  role: RoleName,
  customRoleId?: number | null,
): PermissionKey[] {
  if (customRoleId != null) {
    const custom = permissionsForCustomRole(customRoleId);
    if (custom.length > 0) return custom;
  }
  return permissionsForRole(role);
}

/** Does the given role have the given permission? (Ignores custom roles — prefer {@link userCan}.) */
export function can(role: RoleName, permission: PermissionKey): boolean {
  return permissionsForRole(role).includes(permission);
}

/** Effective permission check for a signed-in user (system or custom role). */
export function userCan(
  user: { role: RoleName; customRoleId?: number | null },
  permission: PermissionKey,
): boolean {
  return effectivePermissions(user.role, user.customRoleId).includes(permission);
}

export function userHasPermissions(
  user: { role: RoleName; customRoleId?: number | null },
  keys: PermissionKey[],
  mode: 'any' | 'all' = 'any',
): boolean {
  const eff = new Set(effectivePermissions(user.role, user.customRoleId));
  if (mode === 'all') return keys.every((k) => eff.has(k));
  return keys.some((k) => eff.has(k));
}
