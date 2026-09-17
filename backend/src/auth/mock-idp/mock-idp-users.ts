/**
 * Fixed, deterministic mock Entra identities for local testing (Phase 2). Each mirrors one of
 * the seeded @newvision.local demo accounts so a tester (or an e2e test) can sign in via the
 * mock IdP and land on an account that already exists locally. The `oid` values are stable
 * across restarts — nothing here is randomly generated — so `User.entraObjectId` links made
 * against them stay valid.
 */
export interface MockIdpUser {
  oid: string;
  email: string;
  name: string;
  department?: string;
  /** Mock Entra security group object ids emitted in the ID token `groups` claim. */
  groups?: string[];
}

export const MOCK_TENANT_ID = 'mock-tenant-newvision';

export const MOCK_IDP_USERS: MockIdpUser[] = [
  { oid: 'mock-oid-superadmin', email: 'superadmin@newvision.local', name: 'Super Admin (mock Entra)' },
  { oid: 'mock-oid-itadmin', email: 'itadmin@newvision.local', name: 'IT Admin (mock Entra)' },
  { oid: 'mock-oid-support', email: 'support@newvision.local', name: 'IT Support (mock Entra)' },
  { oid: 'mock-oid-manager', email: 'manager@newvision.local', name: 'Manager (mock Entra)' },
  { oid: 'mock-oid-employee', email: 'employee@newvision.local', name: 'Employee (mock Entra)' },
  // Deliberately NOT linked to any local account — exercises the "no linked account" path.
  // Phase 3 JIT — no pre-existing local row; first sign-in should auto-provision as Employee.
  {
    oid: 'mock-oid-jit-newhire',
    email: 'jit.newhire@newvision.local',
    name: 'JIT New Hire (mock Entra)',
    department: 'Engineering',
    groups: ['mock-group-assetmanager-employees'],
  },
  { oid: 'mock-oid-unlinked', email: 'unlinked.person@newvision.local', name: 'Unlinked Person (mock Entra)' },
];

export function findMockIdpUser(emailOrOid: string): MockIdpUser | undefined {
  return MOCK_IDP_USERS.find(
    (u) => u.email.toLowerCase() === emailOrOid.toLowerCase() || u.oid === emailOrOid,
  );
}
