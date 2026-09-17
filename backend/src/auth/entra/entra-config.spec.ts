import { initialSuperAdminEmails, isInitialSuperAdminEmail } from './entra-config';

describe('initialSuperAdminEmails', () => {
  const prev = process.env.INITIAL_SUPER_ADMIN_EMAILS;

  afterEach(() => {
    process.env.INITIAL_SUPER_ADMIN_EMAILS = prev;
  });

  it('parses a comma-separated allowlist', () => {
    process.env.INITIAL_SUPER_ADMIN_EMAILS = 'A@Co.com, b@co.com ,';
    expect(isInitialSuperAdminEmail('a@co.com')).toBe(true);
    expect(isInitialSuperAdminEmail('b@co.com')).toBe(true);
    expect(isInitialSuperAdminEmail('other@co.com')).toBe(false);
    expect(initialSuperAdminEmails().size).toBe(2);
  });

  it('is empty when unset', () => {
    delete process.env.INITIAL_SUPER_ADMIN_EMAILS;
    expect(initialSuperAdminEmails().size).toBe(0);
  });
});
