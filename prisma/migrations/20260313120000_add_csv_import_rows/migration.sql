-- CreateEnum
CREATE TYPE "ImportRowResolution" AS ENUM ('PENDING', 'DUPLICATE', 'SKIP', 'MERGE', 'IMPORT');

-- CreateTable
CREATE TABLE "csv_import_rows" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "row_index" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_title" TEXT,
    "phone_number" TEXT NOT NULL,
    "country" TEXT,
    "location" TEXT,
    "headcount" INTEGER,
    "headcount_growth_6m" DECIMAL(5,2),
    "headcount_growth_12m" DECIMAL(5,2),
    "email" TEXT,
    "website" TEXT,
    "personal_linkedin" TEXT,
    "company_linkedin" TEXT,
    "industry" TEXT,
    "company_overview" TEXT,
    "existing_lead_id" TEXT,
    "resolution" "ImportRowResolution" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csv_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "csv_import_rows_import_id_resolution_idx" ON "csv_import_rows"("import_id", "resolution");

-- CreateIndex
CREATE INDEX "csv_import_rows_import_id_row_index_idx" ON "csv_import_rows"("import_id", "row_index");

-- AddForeignKey
ALTER TABLE "csv_import_rows" ADD CONSTRAINT "csv_import_rows_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "csv_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csv_import_rows" ADD CONSTRAINT "csv_import_rows_existing_lead_id_fkey" FOREIGN KEY ("existing_lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropColumn
ALTER TABLE "csv_imports" DROP COLUMN "duplicate_data";
