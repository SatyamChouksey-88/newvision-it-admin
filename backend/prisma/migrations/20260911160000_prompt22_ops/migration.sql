-- Prompt 22 ops: physical audit stamp, loaner expected return, maintenance↔ticket, issue kits.

ALTER TABLE "assets" ADD COLUMN "last_audited_at" TIMESTAMP(3);
ALTER TABLE "assets" ADD COLUMN "next_audit_due_at" TIMESTAMP(3);
CREATE INDEX "assets_last_audited_at_idx" ON "assets"("last_audited_at");

ALTER TABLE "asset_assignments" ADD COLUMN "expected_return_at" TIMESTAMP(3);
CREATE INDEX "asset_assignments_expected_return_at_idx" ON "asset_assignments"("expected_return_at");

ALTER TABLE "asset_maintenance" ADD COLUMN "support_ticket_id" INTEGER;
CREATE INDEX "asset_maintenance_support_ticket_id_idx" ON "asset_maintenance"("support_ticket_id");
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "issue_kits" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "location_id" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_kits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "issue_kit_accessories" (
    "id" SERIAL NOT NULL,
    "kit_id" INTEGER NOT NULL,
    "accessory_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "issue_kit_accessories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "issue_kit_accessories_kit_id_accessory_id_key" ON "issue_kit_accessories"("kit_id", "accessory_id");

ALTER TABLE "issue_kits" ADD CONSTRAINT "issue_kits_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issue_kits" ADD CONSTRAINT "issue_kits_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "issue_kit_accessories" ADD CONSTRAINT "issue_kit_accessories_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "issue_kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_kit_accessories" ADD CONSTRAINT "issue_kit_accessories_accessory_id_fkey" FOREIGN KEY ("accessory_id") REFERENCES "accessories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
