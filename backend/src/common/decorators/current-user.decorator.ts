import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: RoleName;
  employeeId: number | null;
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
