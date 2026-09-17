-- Phase 3: store Entra department claim on the user record for JIT-provisioned logins.
ALTER TABLE "users" ADD COLUMN "entra_department" TEXT;
