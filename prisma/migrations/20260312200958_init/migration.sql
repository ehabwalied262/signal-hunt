-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BDR', 'ADMIN');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'WRONG_NUMBER', 'CALLBACK_SCHEDULED');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('INITIATING', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DispositionType" AS ENUM ('INTERESTED', 'NOT_INTERESTED', 'CALLBACK', 'WRONG_NUMBER', 'NO_ANSWER', 'VOICEMAIL', 'GATEKEEPER', 'OTHER');

-- CreateEnum
CREATE TYPE "TelephonyProvider" AS ENUM ('TWILIO', 'TELNYX');

-- CreateEnum
CREATE TYPE "TranscriptionProvider" AS ENUM ('DEEPGRAM', 'ASSEMBLYAI');

-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'AWAITING_DEDUP_REVIEW');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'BDR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_numbers" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "provider" "TelephonyProvider" NOT NULL,
    "provider_sid" TEXT,
    "assigned_user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_title" TEXT,
    "phone_number" TEXT NOT NULL,
    "country" TEXT,
    "location" TEXT,
    "headcount" INTEGER,
    "headcount_growth_6m" DECIMAL(5,2),
    "headcount_growth_12m" DECIMAL(5,2),
    "company_overview" TEXT,
    "ai_summary" TEXT,
    "owner_id" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "is_wrong_number" BOOLEAN NOT NULL DEFAULT false,
    "source_import_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "provider_call_id" TEXT,
    "status" "CallStatus" NOT NULL DEFAULT 'INITIATING',
    "started_at" TIMESTAMP(3),
    "answered_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "talk_time_seconds" INTEGER,
    "recording_url" TEXT,
    "recording_sid" TEXT,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositions" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "type" "DispositionType" NOT NULL,
    "notes" TEXT,
    "pain_points" TEXT,
    "callback_scheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcriptions" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "provider" "TranscriptionProvider" NOT NULL,
    "status" "TranscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "text" TEXT,
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csv_imports" (
    "id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "total_rows" INTEGER,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "new_leads" INTEGER NOT NULL DEFAULT 0,
    "duplicates_found" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "duplicate_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csv_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "phone_numbers_assigned_user_id_key" ON "phone_numbers"("assigned_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "phone_numbers_number_provider_key" ON "phone_numbers"("number", "provider");

-- CreateIndex
CREATE INDEX "leads_owner_id_status_idx" ON "leads"("owner_id", "status");

-- CreateIndex
CREATE INDEX "leads_phone_number_idx" ON "leads"("phone_number");

-- CreateIndex
CREATE INDEX "calls_agent_id_status_idx" ON "calls"("agent_id", "status");

-- CreateIndex
CREATE INDEX "calls_lead_id_created_at_idx" ON "calls"("lead_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "dispositions_call_id_key" ON "dispositions"("call_id");

-- CreateIndex
CREATE INDEX "dispositions_type_idx" ON "dispositions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "transcriptions_call_id_key" ON "transcriptions"("call_id");

-- AddForeignKey
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_source_import_id_fkey" FOREIGN KEY ("source_import_id") REFERENCES "csv_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_phone_number_id_fkey" FOREIGN KEY ("phone_number_id") REFERENCES "phone_numbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositions" ADD CONSTRAINT "dispositions_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
