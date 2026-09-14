-- Prompt 38: joining-date extras, accessory catalog depth, checkout serial/parent/due-back.

DO $$ BEGIN
  ALTER TYPE "EmploymentType" ADD VALUE 'intern';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "EmploymentType" ADD VALUE 'consultant';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "expected_start_date" TIMESTAMP(3);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "probation_end_date" TIMESTAMP(3);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "last_working_date" TIMESTAMP(3);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "recover_by_date" TIMESTAMP(3);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "desk_or_seat" TEXT;

CREATE INDEX IF NOT EXISTS "employees_date_joined_idx" ON "employees"("date_joined");
CREATE INDEX IF NOT EXISTS "employees_probation_end_date_idx" ON "employees"("probation_end_date");
CREATE INDEX IF NOT EXISTS "employees_last_working_date_idx" ON "employees"("last_working_date");

ALTER TABLE "accessories" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "accessories" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "accessories" ADD COLUMN IF NOT EXISTS "low_stock_threshold" INTEGER NOT NULL DEFAULT 5;

CREATE INDEX IF NOT EXISTS "accessories_brand_idx" ON "accessories"("brand");

ALTER TABLE "accessory_checkouts" ADD COLUMN IF NOT EXISTS "serial_number" TEXT;
ALTER TABLE "accessory_checkouts" ADD COLUMN IF NOT EXISTS "issued_with_asset_id" INTEGER;
ALTER TABLE "accessory_checkouts" ADD COLUMN IF NOT EXISTS "expected_return_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "accessory_checkouts_issued_with_asset_id_idx" ON "accessory_checkouts"("issued_with_asset_id");
CREATE INDEX IF NOT EXISTS "accessory_checkouts_expected_return_at_idx" ON "accessory_checkouts"("expected_return_at");

DO $$ BEGIN
  ALTER TABLE "accessory_checkouts"
    ADD CONSTRAINT "accessory_checkouts_issued_with_asset_id_fkey"
    FOREIGN KEY ("issued_with_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
