// Loaded before each e2e test file. Points Prisma at a dedicated test database.
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://newvision:newvision@localhost:5432/newvision_test?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret';
process.env.JWT_EXPIRES_IN = '1h';
