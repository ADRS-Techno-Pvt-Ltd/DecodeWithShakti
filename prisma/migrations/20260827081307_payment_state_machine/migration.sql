-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PurchaseStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "PurchaseStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "PurchaseStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "failureCode" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "heldForReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconcileAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "purchaseId" TEXT,
    "providerOrderId" TEXT,
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "rawPayload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentEvent_providerOrderId_idx" ON "PaymentEvent"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_eventId_key" ON "PaymentEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "Purchase_status_expiresAt_idx" ON "Purchase"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Purchase_userId_questionBankId_status_idx" ON "Purchase"("userId", "questionBankId", "status");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
