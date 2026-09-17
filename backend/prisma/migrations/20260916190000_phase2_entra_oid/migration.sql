-- Phase 2: Microsoft Entra ID authentication — account-linking column.
-- Nullable, unique when present. Links a local User to their Entra identity via the
-- immutable `oid` claim (never the email, which can change or be reused).
ALTER TABLE "users" ADD COLUMN "entra_object_id" TEXT;

CREATE UNIQUE INDEX "users_entra_object_id_key" ON "users"("entra_object_id");
