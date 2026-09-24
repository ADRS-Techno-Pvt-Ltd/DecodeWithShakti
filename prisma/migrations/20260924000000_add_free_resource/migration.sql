-- CreateTable
CREATE TABLE "FreeResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "subjectId" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "thumbnailPath" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreeResource_slug_key" ON "FreeResource"("slug");

-- CreateIndex
CREATE INDEX "FreeResource_categoryId_idx" ON "FreeResource"("categoryId");

-- CreateIndex
CREATE INDEX "FreeResource_subjectId_idx" ON "FreeResource"("subjectId");

-- AddForeignKey
ALTER TABLE "FreeResource" ADD CONSTRAINT "FreeResource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeResource" ADD CONSTRAINT "FreeResource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
