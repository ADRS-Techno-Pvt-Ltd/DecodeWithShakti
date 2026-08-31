/*
  Warnings:

  - You are about to drop the column `placement` on the `Banner` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Banner_placement_sortOrder_idx";

-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "placement";

-- DropEnum
DROP TYPE "BannerPlacement";

-- CreateIndex
CREATE INDEX "Banner_sortOrder_idx" ON "Banner"("sortOrder");
