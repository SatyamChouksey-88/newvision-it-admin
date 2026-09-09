-- Prompt 2: asset requests, accessories, consumables, import job updated_count

CREATE TYPE "AssetRequestKind" AS ENUM ('asset', 'accessory');
CREATE TYPE "AssetRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'fulfilled');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'checkout';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'checkin';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'stock_adjust';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'issue';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'approve';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'reject';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'fulfill';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'repair_status';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'low_stock';

ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "updated_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "asset_requests" (
    "id" SERIAL NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "kind" "AssetRequestKind" NOT NULL,
    "category_id" INTEGER,
    "accessory_name" TEXT,
    "reason" TEXT NOT NULL,
    "status" "AssetRequestStatus" NOT NULL DEFAULT 'pending',
    "manager_comment" TEXT,
    "rejection_reason" TEXT,
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "fulfilled_by_id" INTEGER,
    "fulfilled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accessories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity_total" INTEGER NOT NULL,
    "quantity_checked_out" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accessory_checkouts" (
    "id" SERIAL NOT NULL,
    "accessory_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "checked_out_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_in_at" TIMESTAMP(3),
    "processed_by_id" INTEGER,
    "notes" TEXT,

    CONSTRAINT "accessory_checkouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consumables" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity_total" INTEGER NOT NULL,
    "quantity_available" INTEGER NOT NULL,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consumable_issues" (
    "id" SERIAL NOT NULL,
    "consumable_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_by_id" INTEGER,

    CONSTRAINT "consumable_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "asset_requests_status_idx" ON "asset_requests"("status");
CREATE INDEX "asset_requests_requester_id_idx" ON "asset_requests"("requester_id");
CREATE INDEX "accessories_category_idx" ON "accessories"("category");
CREATE INDEX "accessory_checkouts_accessory_id_idx" ON "accessory_checkouts"("accessory_id");
CREATE INDEX "accessory_checkouts_employee_id_idx" ON "accessory_checkouts"("employee_id");
CREATE INDEX "consumables_category_idx" ON "consumables"("category");
CREATE INDEX "consumable_issues_consumable_id_idx" ON "consumable_issues"("consumable_id");
CREATE INDEX "consumable_issues_employee_id_idx" ON "consumable_issues"("employee_id");

ALTER TABLE "asset_requests" ADD CONSTRAINT "asset_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_requests" ADD CONSTRAINT "asset_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_requests" ADD CONSTRAINT "asset_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_requests" ADD CONSTRAINT "asset_requests_fulfilled_by_id_fkey" FOREIGN KEY ("fulfilled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "accessory_checkouts" ADD CONSTRAINT "accessory_checkouts_accessory_id_fkey" FOREIGN KEY ("accessory_id") REFERENCES "accessories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accessory_checkouts" ADD CONSTRAINT "accessory_checkouts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accessory_checkouts" ADD CONSTRAINT "accessory_checkouts_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "consumable_issues" ADD CONSTRAINT "consumable_issues_consumable_id_fkey" FOREIGN KEY ("consumable_id") REFERENCES "consumables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consumable_issues" ADD CONSTRAINT "consumable_issues_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consumable_issues" ADD CONSTRAINT "consumable_issues_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
