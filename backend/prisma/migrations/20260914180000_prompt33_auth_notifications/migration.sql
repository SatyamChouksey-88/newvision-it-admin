-- Prompt 33: second concurrent refresh slot, CERT-In-style auth actions,
-- and drop leftover broadcast notification rows (user_id IS NULL).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "refresh_token_hash_2" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "refresh_token_expires_at_2" TIMESTAMP(3);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'login';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'logout';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'auth_failure';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'password_change';

DELETE FROM "notifications" WHERE "user_id" IS NULL;
