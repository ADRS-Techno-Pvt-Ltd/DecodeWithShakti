-- CreateEnum
CREATE TYPE "BannerPlacement" AS ENUM ('MAIN', 'SIDE_LEFT', 'SIDE_RIGHT');

-- DropIndex
DROP INDEX "Banner_sortOrder_idx";

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "placement" "BannerPlacement" NOT NULL DEFAULT 'MAIN';

-- CreateIndex
CREATE INDEX "Banner_placement_sortOrder_idx" ON "Banner"("placement", "sortOrder");
