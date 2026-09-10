-- AlterEnum
CREATE TYPE "EmploymentType" AS ENUM ('permanent', 'contract');
CREATE TYPE "ChecklistKind" AS ENUM ('onboard', 'offboard');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "employment_type" "EmploymentType" NOT NULL DEFAULT 'permanent';
ALTER TABLE "employees" ADD COLUMN "contract_end_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ChecklistKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "checklist_template_items" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "checklist_template_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_checklists" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "template_id" INTEGER,
    "kind" "ChecklistKind" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_checklists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_checklist_items" (
    "id" SERIAL NOT NULL,
    "checklist_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "done_at" TIMESTAMP(3),
    "done_by_id" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "employee_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_checklists_employee_id_idx" ON "employee_checklists"("employee_id");

ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_checklists" ADD CONSTRAINT "employee_checklists_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_checklist_items" ADD CONSTRAINT "employee_checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "employee_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed starter templates
INSERT INTO "checklist_templates" ("name", "kind", "updated_at") VALUES
  ('Laptop onboarding', 'onboard', CURRENT_TIMESTAMP),
  ('Contractor offboarding', 'offboard', CURRENT_TIMESTAMP);

INSERT INTO "checklist_template_items" ("template_id", "label", "sort_order")
SELECT id, x.label, x.sort FROM "checklist_templates" t
CROSS JOIN (VALUES
  ('Issue laptop / desktop', 0),
  ('Create email + directory account', 1),
  ('VPN / MFA enrolment', 2),
  ('ID badge', 3)
) AS x(label, sort)
WHERE t.name = 'Laptop onboarding';

INSERT INTO "checklist_template_items" ("template_id", "label", "sort_order")
SELECT id, x.label, x.sort FROM "checklist_templates" t
CROSS JOIN (VALUES
  ('Recover assigned assets', 0),
  ('Disable login', 1),
  ('Revoke VPN / badges', 2),
  ('Confirm contract end', 3)
) AS x(label, sort)
WHERE t.name = 'Contractor offboarding';
