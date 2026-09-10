-- CreateEnum
CREATE TYPE "TicketChannel" AS ENUM ('portal', 'email');

-- CreateEnum
CREATE TYPE "TicketMessageDirection" AS ENUM ('inbound', 'outbound');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'waiting_on_employee';

-- DropForeignKey
ALTER TABLE "canned_responses" DROP CONSTRAINT "canned_responses_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "record_notes" DROP CONSTRAINT "record_notes_author_id_fkey";

-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_category_id_fkey";

-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_raised_by_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_attachments" DROP CONSTRAINT "ticket_attachments_uploaded_by_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_comments" DROP CONSTRAINT "ticket_comments_author_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_templates" DROP CONSTRAINT "ticket_templates_category_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_templates" DROP CONSTRAINT "ticket_templates_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_time_logs" DROP CONSTRAINT "ticket_time_logs_staff_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_watchers" DROP CONSTRAINT "ticket_watchers_employee_id_fkey";

-- DropIndex
DROP INDEX "notifications_support_ticket_id_idx";

-- AlterTable
ALTER TABLE "accessories" ADD COLUMN     "location_id" INTEGER;

-- AlterTable
ALTER TABLE "consumables" ADD COLUMN     "location_id" INTEGER;

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "channel" "TicketChannel" NOT NULL DEFAULT 'portal',
ADD COLUMN     "first_response_at" TIMESTAMP(3),
ADD COLUMN     "unmatched_sender" TEXT,
ADD COLUMN     "waiting_since" TIMESTAMP(3),
ADD COLUMN     "waiting_total_minutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ticket_comments" ADD COLUMN     "unmatched_sender" TEXT,
ALTER COLUMN "author_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "refresh_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "refresh_token_hash" TEXT,
ADD COLUMN     "reset_password_expires_at" TIMESTAMP(3),
ADD COLUMN     "reset_password_token_hash" TEXT;

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "direction" "TicketMessageDirection" NOT NULL,
    "message_id" TEXT NOT NULL,
    "in_reply_to" TEXT,
    "references" TEXT,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT,
    "subject" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_priority_targets" (
    "id" SERIAL NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "target_minutes" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_priority_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_ingest_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "last_checked_at" TIMESTAMP(3),
    "last_message_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_ingest_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_messages_message_id_key" ON "ticket_messages"("message_id");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_messages_in_reply_to_idx" ON "ticket_messages"("in_reply_to");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_priority_targets_priority_key" ON "ticket_priority_targets"("priority");

-- CreateIndex
CREATE INDEX "accessories_location_id_idx" ON "accessories"("location_id");

-- CreateIndex
CREATE INDEX "consumables_location_id_idx" ON "consumables"("location_id");

-- AddForeignKey
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumables" ADD CONSTRAINT "consumables_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ticket_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_raised_by_id_fkey" FOREIGN KEY ("raised_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_watchers" ADD CONSTRAINT "ticket_watchers_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_time_logs" ADD CONSTRAINT "ticket_time_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canned_responses" ADD CONSTRAINT "canned_responses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_templates" ADD CONSTRAINT "ticket_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ticket_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_templates" ADD CONSTRAINT "ticket_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_notes" ADD CONSTRAINT "record_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
