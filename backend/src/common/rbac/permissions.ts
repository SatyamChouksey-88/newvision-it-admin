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

const ALL: PermissionKey[] = [
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

/** Does the given role have the given permission? Enforced at the API layer. */
export function can(role: RoleName, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
