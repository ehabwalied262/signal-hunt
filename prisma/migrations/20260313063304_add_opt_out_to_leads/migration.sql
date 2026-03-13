-- AlterEnum
ALTER TYPE "DispositionType" ADD VALUE 'OPT_OUT';

-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'OPT_OUT';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "company_linkedin" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "is_opt_out" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "personal_linkedin" TEXT,
ADD COLUMN     "website" TEXT;
