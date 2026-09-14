-- Prompt 32: repair vendor FK + request fulfillment asset + overdue mail stamp
ALTER TABLE "asset_maintenance" ADD COLUMN IF NOT EXISTS "vendor_id" INTEGER;
ALTER TABLE "asset_requests" ADD COLUMN IF NOT EXISTS "fulfilled_asset_id" INTEGER;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "overdue_mailed_at" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "asset_maintenance"
    ADD CONSTRAINT "asset_maintenance_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "asset_requests"
    ADD CONSTRAINT "asset_requests_fulfilled_asset_id_fkey"
    FOREIGN KEY ("fulfilled_asset_id") REFERENCES "assets"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "asset_maintenance_vendor_id_idx" ON "asset_maintenance"("vendor_id");
CREATE INDEX IF NOT EXISTS "asset_requests_fulfilled_asset_id_idx" ON "asset_requests"("fulfilled_asset_id");
