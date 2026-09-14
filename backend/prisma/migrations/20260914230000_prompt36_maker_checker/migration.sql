-- Prompt 36 A4: account holder name for maker-checker bank KYC (no penny-drop API).

ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "account_holder_name" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "account_holder_override_reason" TEXT;
