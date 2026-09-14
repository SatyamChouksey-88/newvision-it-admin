-- Prompt 36 A5: typed compliance documents (cancelled cheque, PAN, GST, MSME).

DO $$ BEGIN
  CREATE TYPE "VendorDocKind" AS ENUM ('gst_certificate', 'pan', 'cancelled_cheque', 'msme', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "vendor_compliance_docs" ADD COLUMN IF NOT EXISTS "doc_kind" "VendorDocKind" NOT NULL DEFAULT 'other';
