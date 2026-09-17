import { describe, expect, it } from '@jest/globals';
import { RoleName } from '@prisma/client';
import { actorMayAssignRole } from './role-authority';

describe('role-authority', () => {
  it('Super Admin can assign any system role', () => {
    expect(actorMayAssignRole(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)).toBe(true);
    expect(actorMayAssignRole(RoleName.SUPER_ADMIN, RoleName.EMPLOYEE)).toBe(true);
  });

  it('IT Admin cannot assign IT Admin or Super Admin', () => {
    expect(actorMayAssignRole(RoleName.IT_ADMIN, RoleName.SUPER_ADMIN)).toBe(false);
    expect(actorMayAssignRole(RoleName.IT_ADMIN, RoleName.IT_ADMIN)).toBe(false);
    expect(actorMayAssignRole(RoleName.IT_ADMIN, RoleName.MANAGER)).toBe(true);
  });
});
