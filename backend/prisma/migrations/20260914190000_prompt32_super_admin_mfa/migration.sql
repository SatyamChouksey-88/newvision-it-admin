-- Super Admin TOTP (encrypted secret). Enrollment is enforced in production.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret_enc" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'mfa_enroll';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'mfa_verify';
