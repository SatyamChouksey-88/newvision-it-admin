import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { AuthUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  PERMISSIONS_KEY,
  type PermissionRequirement,
} from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { userHasPermissions } from '../rbac/permissions';
import { permissionsForRoute } from '../rbac/route-permissions';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const ctxType = (context as { getType?: () => string }).getType?.() ?? 'http';
    if (ctxType === 'ws') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const explicitPerms = this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const routePerms = permissionsForRoute(context);
    const permissionReq: PermissionRequirement | undefined =
      explicitPerms ??
      (routePerms?.length ? { keys: routePerms, mode: 'any' } : undefined);

    if ((!requiredRoles || requiredRoles.length === 0) && !permissionReq?.keys?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    if (user.customRoleId != null) {
      if (!permissionReq?.keys?.length) {
        throw new ForbiddenException('This route is not available for custom-role accounts');
      }
      const ok = userHasPermissions(user, permissionReq.keys, permissionReq.mode ?? 'any');
      if (!ok) {
        throw new ForbiddenException(
          `Missing required permission(s): ${permissionReq.keys.join(', ')}`,
        );
      }
      return true;
    }

    if (requiredRoles?.length) {
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException(
          `Requires one of roles: ${requiredRoles.join(', ')}. You are ${user.role}.`,
        );
      }
      return true;
    }

    if (permissionReq?.keys?.length) {
      const ok = userHasPermissions(user, permissionReq.keys, permissionReq.mode ?? 'any');
      if (!ok) {
        throw new ForbiddenException(
          `Missing required permission(s): ${permissionReq.keys.join(', ')}`,
        );
      }
      return true;
    }

    throw new ForbiddenException('Forbidden');
  }
}
