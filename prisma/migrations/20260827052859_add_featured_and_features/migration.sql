-- AlterTable
ALTER TABLE "QuestionBank" ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;
