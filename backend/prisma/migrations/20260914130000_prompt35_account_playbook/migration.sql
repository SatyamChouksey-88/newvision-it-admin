-- Prompt 35 Item 1: identity verification timestamp on password / MFA tickets
ALTER TABLE "support_tickets" ADD COLUMN "identity_verified_at" TIMESTAMP(3);
ALTER TABLE "support_tickets" ADD COLUMN "verified_by_id" INTEGER;

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "support_tickets_verified_by_id_idx" ON "support_tickets"("verified_by_id");
