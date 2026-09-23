-- Pins a student to the exact answer-key file they first viewed, so a later
-- admin replace (correction/errata) doesn't retroactively change what they
-- already saw. Snapshot is taken lazily on first view, not at purchase time,
-- since an answer key is often uploaded after the purchase and one purchase
-- can unlock several (one per Test Series paper).
CREATE TABLE "AnswerKeyAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answerKeyId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerKeyAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnswerKeyAccess_userId_answerKeyId_key" ON "AnswerKeyAccess"("userId", "answerKeyId");

CREATE INDEX "AnswerKeyAccess_answerKeyId_idx" ON "AnswerKeyAccess"("answerKeyId");

ALTER TABLE "AnswerKeyAccess" ADD CONSTRAINT "AnswerKeyAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnswerKeyAccess" ADD CONSTRAINT "AnswerKeyAccess_answerKeyId_fkey" FOREIGN KEY ("answerKeyId") REFERENCES "AnswerKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
