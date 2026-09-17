import { afterEach, describe, expect, it } from '@jest/globals';
import { demoLoginsAllowed, isDemoLoginEmail } from './demo-logins';

describe('demoLoginsAllowed — Phase 1: opt-in only, never a silent default', () => {
  const original = process.env.ALLOW_DEMO_LOGINS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_DEMO_LOGINS;
    else process.env.ALLOW_DEMO_LOGINS = original;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('defaults to false when ALLOW_DEMO_LOGINS is unset, in development', () => {
    delete process.env.ALLOW_DEMO_LOGINS;
    process.env.NODE_ENV = 'development';
    expect(demoLoginsAllowed()).toBe(false);
  });

  it('defaults to false when ALLOW_DEMO_LOGINS is unset, in test', () => {
    delete process.env.ALLOW_DEMO_LOGINS;
    process.env.NODE_ENV = 'test';
    expect(demoLoginsAllowed()).toBe(false);
  });

  it('defaults to false when ALLOW_DEMO_LOGINS is unset, in production', () => {
    delete process.env.ALLOW_DEMO_LOGINS;
    process.env.NODE_ENV = 'production';
    expect(demoLoginsAllowed()).toBe(false);
  });

  it('is true only when explicitly set to "true"', () => {
    process.env.ALLOW_DEMO_LOGINS = 'true';
    expect(demoLoginsAllowed()).toBe(true);
  });

  it('is false when explicitly set to "false"', () => {
    process.env.ALLOW_DEMO_LOGINS = 'false';
    expect(demoLoginsAllowed()).toBe(false);
  });

  it('is false for any other stray value', () => {
    process.env.ALLOW_DEMO_LOGINS = 'yes';
    expect(demoLoginsAllowed()).toBe(false);
  });
});

describe('isDemoLoginEmail', () => {
  it('matches seeded demo accounts case-insensitively', () => {
    expect(isDemoLoginEmail('SuperAdmin@NewVision.local')).toBe(true);
    expect(isDemoLoginEmail('itadmin@newvision.local')).toBe(true);
  });

  it('does not match an arbitrary email', () => {
    expect(isDemoLoginEmail('real.person@acmecorp.com')).toBe(false);
  });
});
