import { execSync } from 'node:child_process';
import { Client } from 'pg';

const TEST_DB =
  process.env.DATABASE_URL_TEST ||
  'postgresql://newvision:newvision@localhost:5432/newvision_test?schema=public';

/** Create the test database (if missing) and apply migrations before the e2e suite runs. */
export default async function globalSetup(): Promise<void> {
  const url = new URL(TEST_DB);
  const dbName = url.pathname.replace(/^\//, '').split('?')[0];

  // Connect to the default maintenance DB to create the test DB if needed.
  const adminUrl = new URL(TEST_DB);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString().replace(/\?.*$/, '') });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    // eslint-disable-next-line no-console
    console.log(`[e2e] created test database ${dbName}`);
  }
  await admin.end();

  // Apply migrations to the test DB.
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DB },
    stdio: 'ignore',
  });
  // eslint-disable-next-line no-console
  console.log('[e2e] migrations applied to test database');
}
