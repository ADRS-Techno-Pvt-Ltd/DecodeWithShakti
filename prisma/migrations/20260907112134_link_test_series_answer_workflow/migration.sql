/*
  Warnings:

  - A unique constraint covering the columns `[studentId,questionBankId]` on the table `AnswerSheetSubmission` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AnswerSheetSubmission_studentId_categoryId_key";

-- AlterTable
ALTER TABLE "AnswerKey" ADD COLUMN     "questionBankId" TEXT;

-- AlterTable
ALTER TABLE "AnswerSheetSubmission" ADD COLUMN     "questionBankId" TEXT;

-- CreateIndex
CREATE INDEX "AnswerKey_questionBankId_isPublished_createdAt_idx" ON "AnswerKey"("questionBankId", "isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "AnswerSheetSubmission_questionBankId_studentId_status_idx" ON "AnswerSheetSubmission"("questionBankId", "studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerSheetSubmission_studentId_questionBankId_key" ON "AnswerSheetSubmission"("studentId", "questionBankId");

-- AddForeignKey
ALTER TABLE "AnswerSheetSubmission" ADD CONSTRAINT "AnswerSheetSubmission_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerKey" ADD CONSTRAINT "AnswerKey_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
