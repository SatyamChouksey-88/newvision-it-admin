/** Seeded demo accounts. Blocked in production unless ALLOW_DEMO_LOGINS=true. */
export const DEMO_LOGIN_EMAILS = new Set([
  'superadmin@newvision.local',
  'itadmin@newvision.local',
  'support@newvision.local',
  'manager@newvision.local',
  'employee@newvision.local',
]);

export function demoLoginsAllowed(): boolean {
  if (process.env.ALLOW_DEMO_LOGINS === 'true') return true;
  if (process.env.ALLOW_DEMO_LOGINS === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export function isDemoLoginEmail(email: string): boolean {
  return DEMO_LOGIN_EMAILS.has(email.trim().toLowerCase());
}
