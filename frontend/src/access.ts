import type { RoleName } from './types';

/** Mirrors backend `permissions.ts` so nav and page actions share one truth. */
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

export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  SUPER_ADMIN: ALL,
  IT_ADMIN: ALL.filter((p) => p !== 'user:manage' && p !== 'asset:delete'),
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

export function can(role: string | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role as RoleName]?.includes(permission) ?? false;
}

export function isItConsole(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'IT_ADMIN' || role === 'IT_SUPPORT';
}

export function isEmployee(role?: string) {
  return role === 'EMPLOYEE';
}

export function isManager(role?: string) {
  return role === 'MANAGER';
}

export interface NavItem {
  key: string;
  href: string;
  label: string;
  resource: string;
  badgeKey?: 'assets' | 'employees' | 'maintenance' | 'requests' | 'tickets';
  hint?: string;
}

/** Role-specific sidebar. Labels change for My IT / Manager so the shell is visibly different. */
export function navForRole(role?: string): NavItem[] {
  if (role === 'EMPLOYEE') {
    return [
      { key: 'home', href: '/', label: 'Home', resource: 'dashboard' },
      { key: 'devices', href: '/assets', label: 'My devices', resource: 'assets' },
      { key: 'request', href: '/requests', label: 'Raise a request', resource: 'asset-requests' },
      {
        key: 'tickets',
        href: '/tickets',
        label: 'My tickets',
        resource: 'support-tickets',
        badgeKey: 'tickets',
      },
      { key: 'help', href: '/help', label: 'Help', resource: 'help' },
    ];
  }
  if (role === 'MANAGER') {
    return [
      { key: 'home', href: '/', label: 'Team', resource: 'dashboard' },
      {
        key: 'requests',
        href: '/requests',
        label: 'Requests',
        resource: 'asset-requests',
        badgeKey: 'requests',
      },
      {
        key: 'tickets',
        href: '/tickets',
        label: 'Team tickets',
        resource: 'support-tickets',
        badgeKey: 'tickets',
      },
      {
        key: 'requisitions',
        href: '/procurement/requisitions',
        label: 'Requisitions',
        resource: 'purchase-requisitions',
      },
      { key: 'reports', href: '/reports', label: 'Reports', resource: 'reports' },
      { key: 'help', href: '/help', label: 'Help', resource: 'help' },
    ];
  }
  const it: NavItem[] = [
    { key: 'dash', href: '/', label: 'Dashboard', resource: 'dashboard' },
    { key: 'assets', href: '/assets', label: 'Assets', resource: 'assets', badgeKey: 'assets' },
    {
      key: 'employees',
      href: '/employees',
      label: 'Employees',
      resource: 'employees',
      badgeKey: 'employees',
    },
  ];
  if (role === 'SUPER_ADMIN' || role === 'IT_ADMIN') {
    it.push({ key: 'locations', href: '/locations', label: 'Locations', resource: 'locations' });
  }
  it.push(
    { key: 'accessories', href: '/accessories', label: 'Accessories', resource: 'accessories' },
    { key: 'consumables', href: '/consumables', label: 'Consumables', resource: 'consumables' },
    {
      key: 'requests',
      href: '/requests',
      label: 'Requests',
      resource: 'asset-requests',
      badgeKey: 'requests',
    },
    {
      key: 'maintenance',
      href: '/maintenance',
      label: 'Maintenance',
      resource: 'maintenance',
      badgeKey: 'maintenance',
    },
    {
      key: 'tickets',
      href: '/tickets',
      label: 'Support Tickets',
      resource: 'support-tickets',
      badgeKey: 'tickets',
    },
  );
  if (role === 'SUPER_ADMIN' || role === 'IT_ADMIN') {
    it.push(
      { key: 'vendors', href: '/procurement/vendors', label: 'Vendors', resource: 'vendors' },
      {
        key: 'requisitions',
        href: '/procurement/requisitions',
        label: 'Requisitions',
        resource: 'purchase-requisitions',
      },
      {
        key: 'orders',
        href: '/procurement/orders',
        label: 'Purchase Orders',
        resource: 'purchase-orders',
      },
      {
        key: 'contracts',
        href: '/procurement/contracts',
        label: 'Contracts',
        resource: 'vendor-contracts',
      },
    );
  }
  it.push({ key: 'reports', href: '/reports', label: 'Reports', resource: 'reports' });
  if (role === 'SUPER_ADMIN' || role === 'IT_ADMIN') {
    it.push({ key: 'audit', href: '/audit-logs', label: 'Audit Log', resource: 'audit-logs' });
    it.push({ key: 'settings', href: '/settings', label: 'Settings', resource: 'settings' });
  }
  return it;
}

export const ROLE_CHIP: Record<string, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#334155', bg: '#E2E8F0' },
  IT_ADMIN: { label: 'IT Admin', color: '#0958D9', bg: '#E6F4FF' },
  IT_SUPPORT: { label: 'IT Support', color: '#15803D', bg: '#F0FDF4' },
  MANAGER: { label: 'Manager', color: '#B45309', bg: '#FFFBEB' },
  EMPLOYEE: { label: 'My IT', color: '#6D28D9', bg: '#F5F3FF' },
};

/** Refine accessControlProvider: hide resources the role must not navigate to. */
export function canAccessResource(
  role: string | undefined,
  resource: string,
  action: string,
): boolean {
  const items = navForRole(role);
  if (items.some((i) => i.resource === resource)) {
    if (action === 'create' || action === 'edit' || action === 'delete') {
      if (resource === 'assets')
        return can(role, action === 'delete' ? 'asset:delete' : 'asset:create');
      if (resource === 'locations') return can(role, 'location:manage');
      if (resource === 'employees') return can(role, 'employee:manage');
    }
    return true;
  }
  if (resource === 'help') return true;
  return false;
}
