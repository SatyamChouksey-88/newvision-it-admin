/** Seeded demo accounts. Blocked in production unless ALLOW_DEMO_LOGINS=true. */
export const DEMO_LOGIN_EMAILS = new Set([
  'superadmin@newvision.local',
  'itadmin@newvision.local',
  'support@newvision.local',
  'manager@newvision.local',
  'employee@newvision.local',
]);

/**
 * Phase 1 hardening: demo logins are opt-in everywhere, never a silent default — including in
 * local/dev — so a forgotten env var can't leave a known password reachable. Set
 * ALLOW_DEMO_LOGINS=true explicitly (docker-compose.yml and backend/.env.example already do,
 * for local dev convenience) to use the seeded @newvision.local accounts.
 */
export function demoLoginsAllowed(): boolean {
  return process.env.ALLOW_DEMO_LOGINS === 'true';
}

export function isDemoLoginEmail(email: string): boolean {
  return DEMO_LOGIN_EMAILS.has(email.trim().toLowerCase());
}
