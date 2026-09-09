import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';
/** Restrict a route to one or more roles. Enforced by RolesGuard at the API layer. */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
