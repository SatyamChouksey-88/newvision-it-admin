-- Prompt 36 A3: GSTIN and PAN as real columns (tax_id kept as a copy).

ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "gstin" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "pan" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "gst_unregistered" BOOLEAN NOT NULL DEFAULT false;

UPDATE "vendors"
SET
  "gstin" = UPPER(REGEXP_REPLACE(TRIM("tax_id"), '\s+', '', 'g')),
  "pan" = SUBSTRING(UPPER(REGEXP_REPLACE(TRIM("tax_id"), '\s+', '', 'g')) FROM 3 FOR 10)
WHERE "tax_id" IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(TRIM("tax_id"), '\s+', '', 'g')) = 15
  AND UPPER(REGEXP_REPLACE(TRIM("tax_id"), '\s+', '', 'g')) ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$';

UPDATE "vendors"
SET "pan" = UPPER(REGEXP_REPLACE(TRIM("tax_id"), '\s+', '', 'g'))
WHERE "pan" IS NULL
  AND "tax_id" IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(TRIM("tax_id"), '\s+', '', 'g')) = 10
  AND UPPER(REGEXP_REPLACE(TRIM("tax_id"), '\s+', '', 'g')) ~ '^[A-Z]{5}[0-9]{4}[A-Z]$';

CREATE INDEX IF NOT EXISTS "vendors_gstin_idx" ON "vendors"("gstin");
CREATE INDEX IF NOT EXISTS "vendors_pan_idx" ON "vendors"("pan");
