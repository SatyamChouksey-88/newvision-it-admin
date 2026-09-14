-- Prompt 32: invalidate access tokens after a password change.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);
