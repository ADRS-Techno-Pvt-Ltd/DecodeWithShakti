-- AlterTable
ALTER TABLE "Subject" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "Subject_categoryId_idx" ON "Subject"("categoryId");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
