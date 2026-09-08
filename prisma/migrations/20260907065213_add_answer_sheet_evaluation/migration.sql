-- CreateEnum
CREATE TYPE "AnswerSheetStatus" AS ENUM ('PENDING_EVALUATION', 'EVALUATED');

-- CreateTable
CREATE TABLE "AnswerSheetSubmission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "studentFilePath" TEXT NOT NULL,
    "studentFileName" TEXT NOT NULL,
    "studentFileSizeBytes" INTEGER NOT NULL,
    "evaluatedFilePath" TEXT,
    "evaluatedFileName" TEXT,
    "evaluatedFileSizeBytes" INTEGER,
    "status" "AnswerSheetStatus" NOT NULL DEFAULT 'PENDING_EVALUATION',
    "evaluatedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnswerSheetSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerKey" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnswerKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerSheetSubmission_studentId_status_submittedAt_idx" ON "AnswerSheetSubmission"("studentId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "AnswerSheetSubmission_categoryId_status_submittedAt_idx" ON "AnswerSheetSubmission"("categoryId", "status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerSheetSubmission_studentId_categoryId_key" ON "AnswerSheetSubmission"("studentId", "categoryId");

-- CreateIndex
CREATE INDEX "AnswerKey_categoryId_isPublished_createdAt_idx" ON "AnswerKey"("categoryId", "isPublished", "createdAt");

-- AddForeignKey
ALTER TABLE "AnswerSheetSubmission" ADD CONSTRAINT "AnswerSheetSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSheetSubmission" ADD CONSTRAINT "AnswerSheetSubmission_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSheetSubmission" ADD CONSTRAINT "AnswerSheetSubmission_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerKey" ADD CONSTRAINT "AnswerKey_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerKey" ADD CONSTRAINT "AnswerKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
