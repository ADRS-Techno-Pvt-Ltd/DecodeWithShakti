-- Snapshot the file a buyer actually paid for, captured at purchase-creation time.
-- QuestionBank.filePath can be replaced later by an admin (corrected upload, new
-- edition); without this snapshot, downloads would silently start serving the
-- replacement to everyone who already bought the old version.
ALTER TABLE "Purchase" ADD COLUMN "fileSnapshotPath" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "fileSnapshotName" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "fileSnapshotSizeBytes" INTEGER;
