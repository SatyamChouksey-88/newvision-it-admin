// Loaded before each e2e test file. Points Prisma at a dedicated test database.
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://newvision:newvision@localhost:5432/newvision_test?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.REQUIRE_SUPERADMIN_MFA = 'false';
// Phase 1 hardening made ALLOW_DEMO_LOGINS opt-in everywhere (no more implicit
// NODE_ENV!=='production' default). Test fixtures (test/helpers.ts) use the same
// @newvision.local emails as the seeded demo accounts, so the suite opts in explicitly here.
process.env.ALLOW_DEMO_LOGINS = process.env.ALLOW_DEMO_LOGINS || 'true';