-- Phase 5: custom roles + labels; system roles keep enum name, customs use custom_key.
ALTER TABLE "roles" ADD COLUMN "custom_key" TEXT;
ALTER TABLE "roles" ADD COLUMN "label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "roles" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "roles" ADD COLUMN "tenant_id" INTEGER;

UPDATE "roles" SET "label" = "name"::text WHERE "name" IS NOT NULL;

ALTER TABLE "roles" ALTER COLUMN "name" DROP NOT NULL;

CREATE UNIQUE INDEX "roles_custom_key_key" ON "roles"("custom_key");
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
