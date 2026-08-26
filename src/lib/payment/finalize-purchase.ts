import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/invoice";
import { saveInvoiceFile } from "@/lib/storage";
import type { CallbackResult } from "./provider";

/**
 * Idempotent purchase finalization — the single place a payment-provider callback
 * (mock today, Cashfree webhook later) applies a SUCCESS/FAILED result. Only ever
 * increments Coupon.usedCount and generates an invoice on the *first* transition
 * to SUCCESS, so duplicate callback delivery is always safe. See docs/HLD.md § 4.
 */
export async function finalizePurchase(result: CallbackResult): Promise<void> {
  const purchase = await prisma.purchase.findUnique({
    where: { providerOrderId: result.providerOrderId },
    include: { user: true, questionBank: true },
  });
  if (!purchase) throw new Error(`No purchase found for order ${result.providerOrderId}`);

  if (purchase.status !== "PENDING") {
    return; // already finalized — idempotent no-op
  }

  if (result.status === "FAILED") {
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: "FAILED", providerPaymentId: result.providerPaymentId },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: "SUCCESS", providerPaymentId: result.providerPaymentId },
    });

    if (purchase.couponId) {
      await tx.coupon.update({
        where: { id: purchase.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }
  });

  const year = new Date().getFullYear();
  const seqSource = await prisma.invoice.count();
  const invoiceNumber = `INV-${year}-${String(seqSource + 1).padStart(6, "0")}`;

  const pdfBytes = await generateInvoicePdf({
    invoiceNumber,
    issuedAt: new Date(),
    buyerName: purchase.user.name,
    buyerEmail: purchase.user.email,
    itemTitle: purchase.questionBank.title,
    basePrice: purchase.basePriceSnapshot,
    discountAmount: purchase.discountAmount,
    couponCode: purchase.couponCodeSnapshot,
    totalAmount: purchase.amount,
    paymentProvider: purchase.paymentProvider,
  });

  const filePath = await saveInvoiceFile(invoiceNumber, pdfBytes);

  await prisma.invoice.create({
    data: {
      purchaseId: purchase.id,
      invoiceNumber,
      filePath,
      amount: purchase.amount,
    },
  });
}
