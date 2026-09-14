-- CreateTable
CREATE TABLE "AnswerSheetSubmissionFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "studentFilePath" TEXT NOT NULL,
    "studentFileName" TEXT NOT NULL,
    "studentFileSizeBytes" INTEGER NOT NULL,
    "evaluatedFilePath" TEXT,
    "evaluatedFileName" TEXT,
    "evaluatedFileSizeBytes" INTEGER,
    "status" "AnswerSheetStatus" NOT NULL DEFAULT 'PENDING_EVALUATION',
    "evaluatedById" TEXT,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerSheetSubmissionFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerSheetSubmissionFile_submissionId_status_idx" ON "AnswerSheetSubmissionFile"("submissionId", "status");

-- AddForeignKey
ALTER TABLE "AnswerSheetSubmissionFile" ADD CONSTRAINT "AnswerSheetSubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AnswerSheetSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSheetSubmissionFile" ADD CONSTRAINT "AnswerSheetSubmissionFile_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing submission becomes exactly one file row (reusing
-- the submission's own id, since this is a strict one-to-one copy).
INSERT INTO "AnswerSheetSubmissionFile"
  ("id", "submissionId", "studentFilePath", "studentFileName", "studentFileSizeBytes",
   "evaluatedFilePath", "evaluatedFileName", "evaluatedFileSizeBytes", "status",
   "evaluatedById", "evaluatedAt", "createdAt")
SELECT
  "id", "id", "studentFilePath", "studentFileName", "studentFileSizeBytes",
  "evaluatedFilePath", "evaluatedFileName", "evaluatedFileSizeBytes", "status",
  "evaluatedById", "evaluatedAt", "createdAt"
FROM "AnswerSheetSubmission";

-- DropForeignKey
ALTER TABLE "AnswerSheetSubmission" DROP CONSTRAINT "AnswerSheetSubmission_evaluatedById_fkey";

-- DropIndex
DROP INDEX "AnswerSheetSubmission_categoryId_status_submittedAt_idx";

-- DropIndex
DROP INDEX "AnswerSheetSubmission_questionBankId_studentId_status_idx";

-- DropIndex
DROP INDEX "AnswerSheetSubmission_studentId_status_submittedAt_idx";

-- AlterTable
ALTER TABLE "AnswerSheetSubmission" DROP COLUMN "evaluatedAt",
DROP COLUMN "evaluatedById",
DROP COLUMN "evaluatedFileName",
DROP COLUMN "evaluatedFilePath",
DROP COLUMN "evaluatedFileSizeBytes",
DROP COLUMN "status",
DROP COLUMN "studentFileName",
DROP COLUMN "studentFilePath",
DROP COLUMN "studentFileSizeBytes";

-- CreateIndex
CREATE INDEX "AnswerSheetSubmission_studentId_submittedAt_idx" ON "AnswerSheetSubmission"("studentId", "submittedAt");

-- CreateIndex
CREATE INDEX "AnswerSheetSubmission_questionBankId_studentId_idx" ON "AnswerSheetSubmission"("questionBankId", "studentId");

-- CreateIndex
CREATE INDEX "AnswerSheetSubmission_categoryId_submittedAt_idx" ON "AnswerSheetSubmission"("categoryId", "submittedAt");
