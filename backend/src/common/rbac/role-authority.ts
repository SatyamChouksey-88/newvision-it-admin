import { RoleName } from '@prisma/client';

/** Roles an IT Admin may assign (never IT Admin or Super Admin). */
export const IT_ADMIN_ASSIGNABLE: RoleName[] = [
  RoleName.EMPLOYEE,
  RoleName.IT_SUPPORT,
  RoleName.MANAGER,
];

export function actorMayManageUsers(actorRole: RoleName): boolean {
  return actorRole === RoleName.SUPER_ADMIN || actorRole === RoleName.IT_ADMIN;
}

export function actorMayAssignRole(actorRole: RoleName, targetRole: RoleName): boolean {
  if (actorRole === RoleName.SUPER_ADMIN) return true;
  if (actorRole === RoleName.IT_ADMIN) return IT_ADMIN_ASSIGNABLE.includes(targetRole);
  return false;
}

const ROLE_RANK: Record<RoleName, number> = {
  [RoleName.EMPLOYEE]: 0,
  [RoleName.MANAGER]: 1,
  [RoleName.IT_SUPPORT]: 2,
  [RoleName.IT_ADMIN]: 3,
  [RoleName.SUPER_ADMIN]: 4,
};

/** True when `to` is strictly more privileged than `from` (used to block self-escalation only). */
export function isRoleEscalation(from: RoleName, to: RoleName): boolean {
  return ROLE_RANK[to] > ROLE_RANK[from];
}
