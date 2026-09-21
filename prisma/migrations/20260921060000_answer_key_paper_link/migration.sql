-- AlterTable
ALTER TABLE "AnswerKey" ADD COLUMN "questionBankFileId" TEXT;

-- CreateIndex
CREATE INDEX "AnswerKey_questionBankFileId_idx" ON "AnswerKey"("questionBankFileId");

-- AddForeignKey
ALTER TABLE "AnswerKey" ADD CONSTRAINT "AnswerKey_questionBankFileId_fkey" FOREIGN KEY ("questionBankFileId") REFERENCES "QuestionBankFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
