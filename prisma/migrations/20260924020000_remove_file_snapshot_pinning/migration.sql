-- Question Bank and Answer Key downloads now always serve the live file
-- (QuestionBank.filePath / AnswerKey.filePath) instead of a version pinned
-- at purchase-time / first-view, so admin replacements reach every buyer.
-- Drops the now-unused snapshot columns and the AnswerKeyAccess pin table.

-- AnswerKeyAccess
ALTER TABLE "AnswerKeyAccess" DROP CONSTRAINT "AnswerKeyAccess_userId_fkey";
ALTER TABLE "AnswerKeyAccess" DROP CONSTRAINT "AnswerKeyAccess_answerKeyId_fkey";
DROP TABLE "AnswerKeyAccess";

-- Purchase snapshot columns
ALTER TABLE "Purchase" DROP COLUMN "fileSnapshotPath";
ALTER TABLE "Purchase" DROP COLUMN "fileSnapshotName";
ALTER TABLE "Purchase" DROP COLUMN "fileSnapshotSizeBytes";
