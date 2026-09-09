import { describe, expect, it } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { AuthUser } from '../decorators/current-user.decorator';
import { RolesGuard } from './roles.guard';

function contextWith(user?: Partial<AuthUser>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const makeGuard = (opts: { isPublic?: boolean; roles?: RoleName[] }) => {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === 'isPublic') return opts.isPublic ?? false;
        if (key === 'roles') return opts.roles;
        return undefined;
      },
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('allows public routes without a user', () => {
    const guard = makeGuard({ isPublic: true });
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });

  it('allows any authenticated user when no roles are required', () => {
    const guard = makeGuard({ roles: undefined });
    expect(guard.canActivate(contextWith({ role: RoleName.EMPLOYEE }))).toBe(true);
  });

  it('allows a user whose role is in the required set', () => {
    const guard = makeGuard({ roles: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] });
    expect(guard.canActivate(contextWith({ role: RoleName.IT_ADMIN }))).toBe(true);
  });

  it('rejects a user whose role is not permitted', () => {
    const guard = makeGuard({ roles: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] });
    expect(() => guard.canActivate(contextWith({ role: RoleName.EMPLOYEE }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when no user is present on a protected route', () => {
    const guard = makeGuard({ roles: [RoleName.IT_ADMIN] });
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(ForbiddenException);
  });
});
