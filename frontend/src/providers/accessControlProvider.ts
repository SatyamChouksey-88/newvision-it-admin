import type { AccessControlProvider } from '@refinedev/core';
import { canAccessResource } from '../access';
import { readSession, USER_KEY } from './session';
import type { Identity } from './authProvider';

function currentRole(): string | undefined {
  const raw = readSession(USER_KEY);
  if (!raw) return undefined;
  try {
    return (JSON.parse(raw) as Identity).role;
  } catch {
    return undefined;
  }
}

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => ({
    can: canAccessResource(currentRole(), resource ?? '', action),
  }),
};
