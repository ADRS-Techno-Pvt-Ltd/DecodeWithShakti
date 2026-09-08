-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('QUESTION_BANK', 'TEST_SERIES');

-- AlterTable
ALTER TABLE "QuestionBank" ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'QUESTION_BANK';
