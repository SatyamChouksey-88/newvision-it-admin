/**
 * Standalone migration / legacy export dry-run (no commit).
 *
 * Usage (from backend/, with DATABASE_URL and tenant context):
 *   npx tsx scripts/migration-dry-run.ts assets ./path/to/export.csv
 *   npx tsx scripts/migration-dry-run.ts employees ./path/to/hr.xlsx
 *
 * Uses the same column schema as Settings → Import (assets / employees).
 * A real legacy format from Satyam may differ — re-map columns before running.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ImportExportService } from '../src/import-export/import-export.service';
import { runWithTenant, setTestTenant } from '../src/tenancy/context';

const kind = (process.argv[2] ?? '').toLowerCase();
const filePath = process.argv[3];
const tenantId = Number(process.env.DRY_RUN_TENANT_ID ?? '1');

if (!filePath || (kind !== 'assets' && kind !== 'employees')) {
  console.error(
    'Usage: npx tsx scripts/migration-dry-run.ts <assets|employees> <file.csv|.xlsx>',
  );
  process.exit(1);
}

async function main() {
  setTestTenant(tenantId);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const svc = app.get(ImportExportService);
  const buffer = readFileSync(filePath);
  const filename = basename(filePath);
  const result = await runWithTenant(tenantId, () =>
    kind === 'assets' ? svc.dryRunAssets(buffer, filename) : svc.dryRunEmployees(buffer, filename),
  );
  console.log(
    JSON.stringify(
      {
        kind,
        file: filename,
        tenantId,
        total: result.total,
        validRows: result.created,
        invalidRows: result.failed,
        errors: result.errors.slice(0, 50),
        errorsTruncated: result.errors.length > 50,
      },
      null,
      2,
    ),
  );
  await app.close();
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
