-- CreateEnum
CREATE TYPE "ImportKind" AS ENUM ('assets', 'employees');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('queued', 'previewed', 'running', 'completed', 'failed', 'rolled_back');

-- CreateEnum
CREATE TYPE "ReconciliationKind" AS ENUM ('employees', 'assets');

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" SERIAL NOT NULL,
    "kind" "ImportKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'queued',
    "mapping" JSONB,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "preview" JSONB,
    "created_ids" JSONB,
    "file_data" BYTEA,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_views" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL DEFAULT 'assets',
    "filters" JSONB NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_runs" (
    "id" SERIAL NOT NULL,
    "kind" "ReconciliationKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "match_field" TEXT NOT NULL,
    "in_file_only" INTEGER NOT NULL DEFAULT 0,
    "in_system_only" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "findings" JSONB NOT NULL,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- CreateIndex
CREATE INDEX "import_jobs_created_by_id_idx" ON "import_jobs"("created_by_id");

-- CreateIndex
CREATE INDEX "saved_views_resource_created_by_id_idx" ON "saved_views"("resource", "created_by_id");

-- CreateIndex
CREATE INDEX "reconciliation_runs_created_at_idx" ON "reconciliation_runs"("created_at");

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
