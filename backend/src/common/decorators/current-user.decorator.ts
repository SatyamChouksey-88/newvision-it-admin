import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { TenantRecord } from '../../tenancy/plans';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: RoleName;
  employeeId: number | null;
  /** Home office — used to pre-fill location on tickets, requests, and requisitions. */
  locationId?: number | null;
  tenantId: number;
  tenantSlug?: string;
  tenant?: TenantRecord;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthUser | undefined,
    ctx: ExecutionContext,
  ): AuthUser | AuthUser[keyof AuthUser] => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    return data ? user?.[data] : user;
  },
);
