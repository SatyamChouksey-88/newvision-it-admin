-- Prompt 37: shared-database multi-tenancy. Existing rows become tenant 1 (NewVision Softcom).

CREATE TYPE "TenantPlan" AS ENUM ('starter', 'team');
CREATE TYPE "TenantStatus" AS ENUM ('trial', 'active', 'expired', 'cancelled');

CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "mail_from_name" TEXT,
    "mail_from_address" TEXT,
    "helpdesk_mailbox" TEXT,
    "plan" "TenantPlan" NOT NULL DEFAULT 'team',
    "status" "TenantStatus" NOT NULL DEFAULT 'trial',
    "trial_ends_at" TIMESTAMP(3),
    "modules" JSONB NOT NULL,
    "seat_cap" INTEGER NOT NULL DEFAULT 10,
    "onboarding" JSONB,
    "activated_at" TIMESTAMP(3),
    "activation_a1_at" TIMESTAMP(3),
    "activation_a2_at" TIMESTAMP(3),
    "profile_opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

INSERT INTO "tenants" (
  "id", "slug", "name", "plan", "status", "modules", "seat_cap", "created_at", "updated_at"
) VALUES (
  1,
  'newvision',
  'NewVision Softcom',
  'team',
  'active',
  '{"procurement":true,"chat":true,"maintenance":true}'::jsonb,
  10,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

SELECT setval(pg_get_serial_sequence('tenants', 'id'), GREATEST(1, (SELECT MAX(id) FROM tenants)));

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users','locations','departments','employees','asset_categories','assets',
    'asset_assignments','asset_transfers','asset_maintenance','audit_logs','notifications',
    'import_jobs','saved_views','reconciliation_runs','webhook_endpoints','asset_requests',
    'accessories','accessory_checkouts','issue_kits','issue_kit_accessories','consumables',
    'consumable_issues','ticket_categories','support_tickets','ticket_messages',
    'ticket_priority_targets','email_ingest_state','ticket_comments','ticket_watchers',
    'ticket_time_logs','ticket_attachments','canned_responses','ticket_templates',
    'checklist_templates','checklist_template_items','employee_checklists','chat_channels',
    'chat_channel_members','chat_messages','chat_attachments','chat_reactions','chat_mentions',
    'employee_checklist_items','record_notes','vendors','vendor_contacts','vendor_status_changes',
    'vendor_compliance_docs','approval_matrix_rules','purchase_requisitions',
    'purchase_requisition_locations','requisition_line_items','requisition_quotes',
    'requisition_approvers','purchase_orders','purchase_order_lines','purchase_order_amendments',
    'goods_receipts','goods_receipt_lines','vendor_invoices','vendor_contracts',
    'vendor_contract_assets','vendor_scorecards','procurement_activity_logs',
    'procurement_attachments','procurement_handoffs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id INTEGER', t);
    EXECUTE format('UPDATE %I SET tenant_id = 1 WHERE tenant_id IS NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)', t || '_tenant_id_idx', t);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE',
      t,
      t || '_tenant_id_fkey'
    );
  END LOOP;
END $$;

DROP INDEX IF EXISTS "locations_code_key";
CREATE UNIQUE INDEX "locations_tenant_id_code_key" ON "locations"("tenant_id", "code");

DROP INDEX IF EXISTS "departments_name_key";
CREATE UNIQUE INDEX "departments_tenant_id_name_key" ON "departments"("tenant_id", "name");

DROP INDEX IF EXISTS "employees_employee_code_key";
CREATE UNIQUE INDEX "employees_tenant_id_employee_code_key" ON "employees"("tenant_id", "employee_code");

DROP INDEX IF EXISTS "employees_email_key";
CREATE UNIQUE INDEX "employees_tenant_id_email_key" ON "employees"("tenant_id", "email");

DROP INDEX IF EXISTS "asset_categories_code_key";
CREATE UNIQUE INDEX "asset_categories_tenant_id_code_key" ON "asset_categories"("tenant_id", "code");

DROP INDEX IF EXISTS "assets_asset_code_key";
CREATE UNIQUE INDEX "assets_tenant_id_asset_code_key" ON "assets"("tenant_id", "asset_code");

DROP INDEX IF EXISTS "assets_serial_number_key";
CREATE UNIQUE INDEX "assets_tenant_id_serial_number_key" ON "assets"("tenant_id", "serial_number");

DROP INDEX IF EXISTS "ticket_categories_code_key";
CREATE UNIQUE INDEX "ticket_categories_tenant_id_code_key" ON "ticket_categories"("tenant_id", "code");

DROP INDEX IF EXISTS "support_tickets_ticket_number_key";
CREATE UNIQUE INDEX "support_tickets_tenant_id_ticket_number_key" ON "support_tickets"("tenant_id", "ticket_number");

DROP INDEX IF EXISTS "ticket_priority_targets_priority_key";
CREATE UNIQUE INDEX "ticket_priority_targets_tenant_id_priority_key" ON "ticket_priority_targets"("tenant_id", "priority");

DROP INDEX IF EXISTS "vendors_vendor_code_key";
CREATE UNIQUE INDEX "vendors_tenant_id_vendor_code_key" ON "vendors"("tenant_id", "vendor_code");

DROP INDEX IF EXISTS "purchase_requisitions_requisition_number_key";
CREATE UNIQUE INDEX "purchase_requisitions_tenant_id_requisition_number_key" ON "purchase_requisitions"("tenant_id", "requisition_number");

DROP INDEX IF EXISTS "purchase_orders_po_number_key";
CREATE UNIQUE INDEX "purchase_orders_tenant_id_po_number_key" ON "purchase_orders"("tenant_id", "po_number");

DROP INDEX IF EXISTS "goods_receipts_grn_number_key";
CREATE UNIQUE INDEX "goods_receipts_tenant_id_grn_number_key" ON "goods_receipts"("tenant_id", "grn_number");

CREATE UNIQUE INDEX IF NOT EXISTS "email_ingest_state_tenant_id_key" ON "email_ingest_state"("tenant_id");
