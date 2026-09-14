-- CreateTable
CREATE TABLE "QuestionBankFile" (
    "id" TEXT NOT NULL,
    "questionBankId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionBankFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionBankFile_questionBankId_createdAt_idx" ON "QuestionBankFile"("questionBankId", "createdAt");

-- AddForeignKey
ALTER TABLE "QuestionBankFile" ADD CONSTRAINT "QuestionBankFile_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
