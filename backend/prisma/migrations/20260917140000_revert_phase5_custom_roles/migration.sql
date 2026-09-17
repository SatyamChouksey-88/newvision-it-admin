-- Roll back partial Phase 5 custom-role columns (superseded by a future migration).
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_tenant_id_fkey";
DROP INDEX IF EXISTS "roles_tenant_id_idx";
DROP INDEX IF EXISTS "roles_custom_key_key";
ALTER TABLE "roles" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "roles" DROP COLUMN IF EXISTS "is_active";
ALTER TABLE "roles" DROP COLUMN IF EXISTS "label";
ALTER TABLE "roles" DROP COLUMN IF EXISTS "custom_key";
ALTER TABLE "roles" ALTER COLUMN "name" SET NOT NULL;
