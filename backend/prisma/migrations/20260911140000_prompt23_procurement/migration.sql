-- Prompt 23: Vendor & Procurement Management

CREATE TYPE "VendorStatus" AS ENUM ('draft', 'pending_approval', 'active', 'suspended', 'blacklisted');
CREATE TYPE "PurchaseRequisitionStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'converted_to_po', 'cancelled');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('draft', 'sent', 'partially_received', 'received', 'closed', 'cancelled');
CREATE TYPE "InvoiceMatchStatus" AS ENUM ('matched', 'exception');
CREATE TYPE "InvoicePaymentStatus" AS ENUM ('pending', 'approved', 'paid', 'overdue', 'disputed', 'cancelled');
CREATE TYPE "VendorContractType" AS ENUM ('warranty', 'amc', 'sla', 'license_subscription');
CREATE TYPE "RequisitionApprovalKind" AS ENUM ('required', 'watcher');
CREATE TYPE "RequisitionApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "ApprovalRouting" AS ENUM ('parallel', 'sequential');
CREATE TYPE "ProcurementRecordType" AS ENUM ('vendor', 'requisition', 'purchase_order', 'goods_receipt', 'invoice', 'contract', 'scorecard');
CREATE TYPE "HandoffKind" AS ENUM ('serialized', 'accessory', 'consumable', 'license');
CREATE TYPE "LineItemKind" AS ENUM ('serialized', 'accessory', 'consumable', 'license');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'procurement';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'contract_renewal';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'vendor_payment';

CREATE TABLE "vendors" (
    "id" SERIAL NOT NULL,
    "vendor_code" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trading_name" TEXT,
    "tax_id" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "registered_address" TEXT,
    "remit_to_address" TEXT,
    "payment_terms" TEXT NOT NULL DEFAULT 'Net 30',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "bank_account_number" TEXT,
    "bank_ifsc_swift" TEXT,
    "pending_bank_account_number" TEXT,
    "pending_bank_ifsc_swift" TEXT,
    "bank_change_pending" BOOLEAN NOT NULL DEFAULT false,
    "default_budget_head" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "VendorStatus" NOT NULL DEFAULT 'draft',
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "rating_summary" DECIMAL(5,2),
    "next_review_date" TIMESTAMP(3),
    "internal_owner_id" INTEGER,
    "approved_by_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendors_vendor_code_key" ON "vendors"("vendor_code");
CREATE INDEX "vendors_status_idx" ON "vendors"("status");
CREATE INDEX "vendors_legal_name_idx" ON "vendors"("legal_name");

CREATE TABLE "vendor_contacts" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role_title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "vendor_contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vendor_contacts_vendor_id_idx" ON "vendor_contacts"("vendor_id");

CREATE TABLE "vendor_status_changes" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "from_status" "VendorStatus" NOT NULL,
    "to_status" "VendorStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "changed_by_id" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_status_changes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vendor_status_changes_vendor_id_idx" ON "vendor_status_changes"("vendor_id");

CREATE TABLE "vendor_compliance_docs" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "filename" TEXT,
    "mime_type" TEXT,
    "data" BYTEA,

    CONSTRAINT "vendor_compliance_docs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vendor_compliance_docs_vendor_id_idx" ON "vendor_compliance_docs"("vendor_id");

CREATE TABLE "approval_matrix_rules" (
    "id" SERIAL NOT NULL,
    "min_amount" DECIMAL(12,2) NOT NULL,
    "category" TEXT,
    "role" "RoleName" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "kind" "RequisitionApprovalKind" NOT NULL DEFAULT 'required',
    "routing" "ApprovalRouting" NOT NULL DEFAULT 'parallel',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_matrix_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_requisitions" (
    "id" SERIAL NOT NULL,
    "requisition_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department_id" INTEGER,
    "department_free_text" TEXT,
    "requester_id" INTEGER NOT NULL,
    "owner_employee_id" INTEGER,
    "request_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "business_requirement" TEXT NOT NULL,
    "proposed_make_model" TEXT,
    "category" TEXT NOT NULL,
    "vendor_id" INTEGER,
    "vendor_free_text" TEXT,
    "budget_head" TEXT,
    "procurement_type" TEXT NOT NULL,
    "remote_employees" BOOLEAN NOT NULL DEFAULT false,
    "location_free_text" TEXT,
    "expected_procurement_date" TIMESTAMP(3),
    "expected_deployment_date" TIMESTAMP(3),
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "total_override" BOOLEAN NOT NULL DEFAULT false,
    "status" "PurchaseRequisitionStatus" NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "routing" "ApprovalRouting" NOT NULL DEFAULT 'parallel',
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_requisitions_requisition_number_key" ON "purchase_requisitions"("requisition_number");
CREATE INDEX "purchase_requisitions_status_idx" ON "purchase_requisitions"("status");
CREATE INDEX "purchase_requisitions_requester_id_idx" ON "purchase_requisitions"("requester_id");

CREATE TABLE "purchase_requisition_locations" (
    "id" SERIAL NOT NULL,
    "requisition_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,

    CONSTRAINT "purchase_requisition_locations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_requisition_locations_requisition_id_location_id_key" ON "purchase_requisition_locations"("requisition_id", "location_id");

CREATE TABLE "requisition_line_items" (
    "id" SERIAL NOT NULL,
    "requisition_id" INTEGER NOT NULL,
    "product" TEXT NOT NULL,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "commercial_notes" TEXT,
    "kind" "LineItemKind" NOT NULL DEFAULT 'serialized',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "requisition_line_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "requisition_line_items_requisition_id_idx" ON "requisition_line_items"("requisition_id");

CREATE TABLE "requisition_quotes" (
    "id" SERIAL NOT NULL,
    "requisition_id" INTEGER NOT NULL,
    "vendor_id" INTEGER,
    "vendor_name" TEXT,
    "quoted_price" DECIMAL(12,2) NOT NULL,
    "lead_time_days" INTEGER,
    "notes" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "requisition_quotes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "requisition_quotes_requisition_id_idx" ON "requisition_quotes"("requisition_id");

CREATE TABLE "requisition_approvers" (
    "id" SERIAL NOT NULL,
    "requisition_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "kind" "RequisitionApprovalKind" NOT NULL DEFAULT 'required',
    "status" "RequisitionApprovalStatus" NOT NULL DEFAULT 'pending',
    "level" INTEGER NOT NULL DEFAULT 1,
    "decided_at" TIMESTAMP(3),
    "comment" TEXT,

    CONSTRAINT "requisition_approvers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "requisition_approvers_requisition_id_idx" ON "requisition_approvers"("requisition_id");
CREATE INDEX "requisition_approvers_user_id_idx" ON "requisition_approvers"("user_id");

CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "po_number" TEXT NOT NULL,
    "requisition_id" INTEGER,
    "vendor_id" INTEGER NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "delivery_date" TIMESTAMP(3),
    "terms" TEXT,
    "location_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "sent_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "short_close_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");
CREATE INDEX "purchase_orders_vendor_id_idx" ON "purchase_orders"("vendor_id");

CREATE TABLE "purchase_order_lines" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "product" TEXT NOT NULL,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "commercial_notes" TEXT,
    "kind" "LineItemKind" NOT NULL DEFAULT 'serialized',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "purchase_order_lines_purchase_order_id_idx" ON "purchase_order_lines"("purchase_order_id");

CREATE TABLE "purchase_order_amendments" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "amended_by_id" INTEGER NOT NULL,
    "amended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_amendments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "purchase_order_amendments_purchase_order_id_idx" ON "purchase_order_amendments"("purchase_order_id");

CREATE TABLE "goods_receipts" (
    "id" SERIAL NOT NULL,
    "grn_number" TEXT NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "location_id" INTEGER,
    "condition_notes" TEXT,
    "discrepancy" TEXT,
    "received_by_id" INTEGER NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "reverse_reason" TEXT,
    "reversed_at" TIMESTAMP(3),

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "goods_receipts_grn_number_key" ON "goods_receipts"("grn_number");
CREATE INDEX "goods_receipts_purchase_order_id_idx" ON "goods_receipts"("purchase_order_id");

CREATE TABLE "goods_receipt_lines" (
    "id" SERIAL NOT NULL,
    "goods_receipt_id" INTEGER NOT NULL,
    "purchase_order_line_id" INTEGER NOT NULL,
    "quantity_received" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "goods_receipt_lines_goods_receipt_id_idx" ON "goods_receipt_lines"("goods_receipt_id");

CREATE TABLE "vendor_contracts" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "type" "VendorContractType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "notice_period_days" INTEGER NOT NULL DEFAULT 30,
    "sla_terms" TEXT,
    "entitlement_count" INTEGER,
    "usage_count" INTEGER,
    "location_id" INTEGER,
    "owner_id" INTEGER,
    "renewed_from_id" INTEGER,
    "filename" TEXT,
    "mime_type" TEXT,
    "data" BYTEA,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_contracts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vendor_contracts_vendor_id_idx" ON "vendor_contracts"("vendor_id");
CREATE INDEX "vendor_contracts_end_date_idx" ON "vendor_contracts"("end_date");

CREATE TABLE "vendor_invoices" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "purchase_order_id" INTEGER,
    "contract_id" INTEGER,
    "invoice_number" TEXT NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3) NOT NULL,
    "match_status" "InvoiceMatchStatus" NOT NULL DEFAULT 'matched',
    "match_notes" TEXT,
    "exception_note" TEXT,
    "payment_status" "InvoicePaymentStatus" NOT NULL DEFAULT 'pending',
    "recorded_by_id" INTEGER NOT NULL,
    "filename" TEXT,
    "mime_type" TEXT,
    "data" BYTEA,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_invoices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vendor_invoices_vendor_id_idx" ON "vendor_invoices"("vendor_id");
CREATE INDEX "vendor_invoices_purchase_order_id_idx" ON "vendor_invoices"("purchase_order_id");
CREATE INDEX "vendor_invoices_payment_status_idx" ON "vendor_invoices"("payment_status");

CREATE TABLE "vendor_contract_assets" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,

    CONSTRAINT "vendor_contract_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vendor_contract_assets_contract_id_asset_id_key" ON "vendor_contract_assets"("contract_id", "asset_id");

CREATE TABLE "vendor_scorecards" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "on_time_delivery_pct" DECIMAL(5,2) NOT NULL,
    "quality_rate" DECIMAL(5,2) NOT NULL,
    "price_competitiveness" DECIMAL(5,2) NOT NULL,
    "responsiveness" DECIMAL(5,2) NOT NULL,
    "overall_score" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "recorded_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_scorecards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vendor_scorecards_vendor_id_idx" ON "vendor_scorecards"("vendor_id");

CREATE TABLE "procurement_activity_logs" (
    "id" SERIAL NOT NULL,
    "record_type" "ProcurementRecordType" NOT NULL,
    "record_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "actor_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_activity_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "procurement_activity_logs_record_type_record_id_idx" ON "procurement_activity_logs"("record_type", "record_id");

CREATE TABLE "procurement_attachments" (
    "id" SERIAL NOT NULL,
    "record_type" "ProcurementRecordType" NOT NULL,
    "record_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploaded_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "procurement_attachments_record_type_record_id_idx" ON "procurement_attachments"("record_type", "record_id");

CREATE TABLE "procurement_handoffs" (
    "id" SERIAL NOT NULL,
    "kind" "HandoffKind" NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "goods_receipt_id" INTEGER,
    "contract_id" INTEGER,
    "asset_id" INTEGER,
    "accessory_id" INTEGER,
    "consumable_id" INTEGER,
    "needs_reconciliation" BOOLEAN NOT NULL DEFAULT false,
    "reconciliation_note" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_handoffs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "procurement_handoffs_purchase_order_id_idx" ON "procurement_handoffs"("purchase_order_id");

ALTER TABLE "assets" ADD COLUMN "vendor_record_id" INTEGER;
ALTER TABLE "assets" ADD COLUMN "purchase_order_id" INTEGER;
ALTER TABLE "assets" ADD COLUMN "goods_receipt_id" INTEGER;
ALTER TABLE "assets" ADD COLUMN "needs_reconciliation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "assets" ADD COLUMN "reconciliation_note" TEXT;

ALTER TABLE "vendors" ADD CONSTRAINT "vendors_internal_owner_id_fkey" FOREIGN KEY ("internal_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_status_changes" ADD CONSTRAINT "vendor_status_changes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_status_changes" ADD CONSTRAINT "vendor_status_changes_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_compliance_docs" ADD CONSTRAINT "vendor_compliance_docs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_owner_employee_id_fkey" FOREIGN KEY ("owner_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_requisition_locations" ADD CONSTRAINT "purchase_requisition_locations_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_requisition_locations" ADD CONSTRAINT "purchase_requisition_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "requisition_line_items" ADD CONSTRAINT "requisition_line_items_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requisition_quotes" ADD CONSTRAINT "requisition_quotes_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requisition_quotes" ADD CONSTRAINT "requisition_quotes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requisition_approvers" ADD CONSTRAINT "requisition_approvers_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requisition_approvers" ADD CONSTRAINT "requisition_approvers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_amendments" ADD CONSTRAINT "purchase_order_amendments_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_amendments" ADD CONSTRAINT "purchase_order_amendments_amended_by_id_fkey" FOREIGN KEY ("amended_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendor_contracts" ADD CONSTRAINT "vendor_contracts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_contracts" ADD CONSTRAINT "vendor_contracts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_contracts" ADD CONSTRAINT "vendor_contracts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_contracts" ADD CONSTRAINT "vendor_contracts_renewed_from_id_fkey" FOREIGN KEY ("renewed_from_id") REFERENCES "vendor_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "vendor_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendor_contract_assets" ADD CONSTRAINT "vendor_contract_assets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "vendor_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_contract_assets" ADD CONSTRAINT "vendor_contract_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vendor_scorecards" ADD CONSTRAINT "vendor_scorecards_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_scorecards" ADD CONSTRAINT "vendor_scorecards_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "procurement_activity_logs" ADD CONSTRAINT "procurement_activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procurement_attachments" ADD CONSTRAINT "procurement_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "procurement_handoffs" ADD CONSTRAINT "procurement_handoffs_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procurement_handoffs" ADD CONSTRAINT "procurement_handoffs_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "procurement_handoffs" ADD CONSTRAINT "procurement_handoffs_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "vendor_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "procurement_handoffs" ADD CONSTRAINT "procurement_handoffs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "procurement_handoffs" ADD CONSTRAINT "procurement_handoffs_accessory_id_fkey" FOREIGN KEY ("accessory_id") REFERENCES "accessories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "procurement_handoffs" ADD CONSTRAINT "procurement_handoffs_consumable_id_fkey" FOREIGN KEY ("consumable_id") REFERENCES "consumables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "procurement_handoffs" ADD CONSTRAINT "procurement_handoffs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assets" ADD CONSTRAINT "assets_vendor_record_id_fkey" FOREIGN KEY ("vendor_record_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
