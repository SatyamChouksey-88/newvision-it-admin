import { describe, expect, it } from '@jest/globals';
import { RoleName } from '@prisma/client';
import { can, ROLE_PERMISSIONS } from './permissions';

describe('RBAC permission matrix', () => {
  it('grants Super Admin everything, including audit and user management', () => {
    expect(can(RoleName.SUPER_ADMIN, 'audit:read')).toBe(true);
    expect(can(RoleName.SUPER_ADMIN, 'user:manage')).toBe(true);
    expect(can(RoleName.SUPER_ADMIN, 'asset:delete')).toBe(true);
  });

  it('lets IT Admin manage assets, repairs and reports but not user management', () => {
    expect(can(RoleName.IT_ADMIN, 'asset:create')).toBe(true);
    expect(can(RoleName.IT_ADMIN, 'asset:assign')).toBe(true);
    expect(can(RoleName.IT_ADMIN, 'asset:transfer')).toBe(true);
    expect(can(RoleName.IT_ADMIN, 'report:run')).toBe(true);
    expect(can(RoleName.IT_ADMIN, 'procurement:manage')).toBe(true);
    expect(can(RoleName.IT_ADMIN, 'user:manage')).toBe(false);
  });

  it('limits IT Support to viewing assets and managing maintenance', () => {
    expect(can(RoleName.IT_SUPPORT, 'asset:read')).toBe(true);
    expect(can(RoleName.IT_SUPPORT, 'maintenance:manage')).toBe(true);
    expect(can(RoleName.IT_SUPPORT, 'asset:create')).toBe(false);
    expect(can(RoleName.IT_SUPPORT, 'asset:assign')).toBe(false);
    expect(can(RoleName.IT_SUPPORT, 'procurement:manage')).toBe(false);
  });

  it('lets Manager view and approve but not modify assets', () => {
    expect(can(RoleName.MANAGER, 'asset:read')).toBe(true);
    expect(can(RoleName.MANAGER, 'request:approve')).toBe(true);
    expect(can(RoleName.MANAGER, 'procurement:request')).toBe(true);
    expect(can(RoleName.MANAGER, 'procurement:manage')).toBe(false);
    expect(can(RoleName.MANAGER, 'asset:create')).toBe(false);
  });

  it('limits Employee to viewing own assets, reporting issues, requesting assets', () => {
    expect(can(RoleName.EMPLOYEE, 'asset:read')).toBe(true);
    expect(can(RoleName.EMPLOYEE, 'issue:report')).toBe(true);
    expect(can(RoleName.EMPLOYEE, 'asset:request')).toBe(true);
    expect(can(RoleName.EMPLOYEE, 'asset:assign')).toBe(false);
    expect(can(RoleName.EMPLOYEE, 'audit:read')).toBe(false);
  });

  it('every role has at least read access and matrix is defined for all roles', () => {
    (Object.values(RoleName) as RoleName[]).forEach((r) => {
      expect(ROLE_PERMISSIONS[r]).toBeDefined();
      expect(can(r, 'asset:read')).toBe(true);
    });
  });
});
