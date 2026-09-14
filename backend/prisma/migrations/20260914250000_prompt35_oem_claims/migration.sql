-- Prompt 35 Item 4: OEM/AMC claim file on the repair ticket
CREATE TYPE "MaintenanceCoverage" AS ENUM ('oem_warranty', 'amc', 'adp', 'chargeable', 'unknown');
CREATE TYPE "MaintenanceIncidentKind" AS ENUM ('defect', 'accidental', 'liquid', 'lost', 'other');

ALTER TABLE "asset_maintenance" ADD COLUMN "coverage" "MaintenanceCoverage" NOT NULL DEFAULT 'unknown';
ALTER TABLE "asset_maintenance" ADD COLUMN "oem_case_id" TEXT;
ALTER TABLE "asset_maintenance" ADD COLUMN "rma_number" TEXT;
ALTER TABLE "asset_maintenance" ADD COLUMN "claim_invoice_no" TEXT;
ALTER TABLE "asset_maintenance" ADD COLUMN "incident_kind" "MaintenanceIncidentKind";

CREATE INDEX "asset_maintenance_oem_case_id_idx" ON "asset_maintenance"("oem_case_id");
