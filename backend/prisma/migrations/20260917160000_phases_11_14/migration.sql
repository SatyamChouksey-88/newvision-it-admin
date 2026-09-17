-- CreateEnum
CREATE TYPE "AuditCycleStatus" AS ENUM ('draft', 'in_progress', 'closed');

-- AlterTable
ALTER TABLE "assets" ADD COLUMN "depreciation_years" INTEGER,
ADD COLUMN "salvage_value" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN "sla_escalated_at" TIMESTAMP(3),
ADD COLUMN "client_id" INTEGER,
ADD COLUMN "vdi_environment_id" INTEGER,
ADD COLUMN "waiting_on_client" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "audit_cycles" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "status" "AuditCycleStatus" NOT NULL DEFAULT 'draft',
    "scope_note" TEXT,
    "started_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "signed_off_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_cycles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_cycle_findings" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "cycle_id" INTEGER NOT NULL,
    "asset_id" INTEGER,
    "exception_type" TEXT NOT NULL,
    "notes" TEXT,
    "evidence_url" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_cycle_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_accounts" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vdi_environments" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "client_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "pool_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vdi_environments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_client_assignments" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL DEFAULT 1,
    "employee_id" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_client_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_cycles_tenant_id_idx" ON "audit_cycles"("tenant_id");
CREATE INDEX "audit_cycles_status_idx" ON "audit_cycles"("status");
CREATE INDEX "audit_cycle_findings_cycle_id_idx" ON "audit_cycle_findings"("cycle_id");
CREATE INDEX "audit_cycle_findings_asset_id_idx" ON "audit_cycle_findings"("asset_id");
CREATE INDEX "audit_cycle_findings_tenant_id_idx" ON "audit_cycle_findings"("tenant_id");
CREATE UNIQUE INDEX "client_accounts_tenant_id_code_key" ON "client_accounts"("tenant_id", "code");
CREATE INDEX "client_accounts_tenant_id_idx" ON "client_accounts"("tenant_id");
CREATE INDEX "vdi_environments_client_id_idx" ON "vdi_environments"("client_id");
CREATE INDEX "vdi_environments_tenant_id_idx" ON "vdi_environments"("tenant_id");
CREATE INDEX "employee_client_assignments_employee_id_idx" ON "employee_client_assignments"("employee_id");
CREATE INDEX "employee_client_assignments_client_id_idx" ON "employee_client_assignments"("client_id");
CREATE INDEX "employee_client_assignments_tenant_id_idx" ON "employee_client_assignments"("tenant_id");
CREATE INDEX "support_tickets_client_id_idx" ON "support_tickets"("client_id");
CREATE INDEX "support_tickets_vdi_environment_id_idx" ON "support_tickets"("vdi_environment_id");

-- AddForeignKey
ALTER TABLE "audit_cycles" ADD CONSTRAINT "audit_cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_cycles" ADD CONSTRAINT "audit_cycles_signed_off_by_id_fkey" FOREIGN KEY ("signed_off_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_cycle_findings" ADD CONSTRAINT "audit_cycle_findings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_cycle_findings" ADD CONSTRAINT "audit_cycle_findings_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_cycle_findings" ADD CONSTRAINT "audit_cycle_findings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vdi_environments" ADD CONSTRAINT "vdi_environments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vdi_environments" ADD CONSTRAINT "vdi_environments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_client_assignments" ADD CONSTRAINT "employee_client_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_client_assignments" ADD CONSTRAINT "employee_client_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_client_assignments" ADD CONSTRAINT "employee_client_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_vdi_environment_id_fkey" FOREIGN KEY ("vdi_environment_id") REFERENCES "vdi_environments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
