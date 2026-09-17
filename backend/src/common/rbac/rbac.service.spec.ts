import { beforeEach, describe, expect, it } from '@jest/globals';
import { RoleName } from '@prisma/client';
import { can, clearRuntimeRolePermissions, ROLE_PERMISSIONS, setRuntimeRolePermissions } from './permissions';

describe('RbacService runtime matrix', () => {
  beforeEach(() => {
    clearRuntimeRolePermissions();
  });

  it('can() uses ROLE_PERMISSIONS until runtime matrix is set', () => {
    expect(can(RoleName.IT_ADMIN, 'asset:create')).toBe(true);
    expect(can(RoleName.IT_ADMIN, 'user:manage')).toBe(false);
  });

  it('can() follows DB-loaded matrix after setRuntimeRolePermissions', () => {
    const custom = { ...ROLE_PERMISSIONS };
    custom.IT_ADMIN = ['asset:read'];
    setRuntimeRolePermissions(custom);
    expect(can(RoleName.IT_ADMIN, 'asset:create')).toBe(false);
    expect(can(RoleName.IT_ADMIN, 'asset:read')).toBe(true);
  });
});
