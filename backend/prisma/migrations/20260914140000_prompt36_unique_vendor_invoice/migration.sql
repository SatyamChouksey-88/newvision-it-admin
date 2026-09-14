-- Prompt 36 A1: one invoice number per vendor (double-pay guard).
-- Existing duplicates keep the earliest row and suffix later ones so the unique index can apply.

UPDATE "vendor_invoices" AS v
SET "invoice_number" = v."invoice_number" || '-DUP-' || v."id"::text
WHERE v."id" IN (
  SELECT d."id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (PARTITION BY "vendor_id", "invoice_number" ORDER BY "id") AS rn
    FROM "vendor_invoices"
  ) AS d
  WHERE d.rn > 1
);

CREATE UNIQUE INDEX "vendor_invoices_vendor_id_invoice_number_key"
  ON "vendor_invoices"("vendor_id", "invoice_number");
