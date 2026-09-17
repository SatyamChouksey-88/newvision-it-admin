import type { ExecutionContext } from '@nestjs/common';
import type { PermissionKey } from './permissions';
import { ROUTE_PERMISSIONS } from './route-permissions.generated';

export function routePermissionKey(context: ExecutionContext): string | undefined {
  const handler = context.getHandler();
  const cls = context.getClass();
  const method = handler?.name;
  if (!cls?.name || !method) return undefined;
  return `${cls.name}.${method}`;
}

export function permissionsForRoute(context: ExecutionContext): PermissionKey[] | undefined {
  const key = routePermissionKey(context);
  if (!key) return undefined;
  return ROUTE_PERMISSIONS[key];
}
