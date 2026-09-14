import { prisma } from "@/lib/prisma";
import type { PurchaseStatus } from "@/generated/prisma/client";
import { generateInvoicePdf } from "@/lib/invoice";
import { saveInvoiceFile } from "@/lib/storage";
import { sendMentorshipPurchaseNotifications } from "./mentorship-notifications";
import type { CallbackResult } from "./provider";

/**
 * Cashfree lets a customer make several payment attempts against ONE order: a
 * failed/dropped attempt fires PAYMENT_FAILED / PAYMENT_USER_DROPPED, and a
 * later successful attempt on the same order fires PAYMENT_SUCCESS. So FAILED
 * and CANCELLED are NOT terminal — a genuine SUCCESS (webhook, or a poll seeing
 * order_status=PAID) must still be able to promote the row. The reverse is not
 * allowed: a late FAILED/CANCELLED must never pull a row back out of SUCCESS.
 */
const PROMOTABLE_TO_SUCCESS: PurchaseStatus[] = ["PENDING", "FAILED", "CANCELLED"];

export type FinalizeOutcome =
  | { applied: true }
  | { applied: false; reason: "still-pending" | "unknown-order" | "amount-mismatch" | "already-finalized" };

/**
 * Idempotent purchase finalization — the single place a payment-provider result
 * (webhook or poll) applies a terminal status. Only ever increments/decrements
 * Coupon.usedCount and generates an invoice on the relevant *first* transition,
 * so duplicate delivery (webhook retries, concurrent polls) is always safe.
 * See docs/CASHFREE-PLAN.md § 1 and § 4.
 */
export async function finalizePurchase(result: CallbackResult): Promise<FinalizeOutcome> {
  if (result.status === "PENDING") {
    return { applied: false, reason: "still-pending" };
  }

  const purchase = await prisma.purchase.findUnique({
    where: { providerOrderId: result.providerOrderId },
  });
  if (!purchase) {
    return { applied: false, reason: "unknown-order" };
  }

  if (result.status === "REFUNDED") {
    return finalizeRefund(purchase.id, result);
  }

  // Amount check BEFORE granting anything — a mismatched SUCCESS is held for
  // review, never auto-finalized.
  if (
    result.status === "SUCCESS" &&
    result.paidAmount != null &&
    result.paidAmount !== purchase.amount
  ) {
    if (PROMOTABLE_TO_SUCCESS.includes(purchase.status)) {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          heldForReview: true,
          failureCode: "amount_mismatch",
          failureReason: `Paid ${result.paidAmount} paise, expected ${purchase.amount} paise.`,
        },
      });
    }
    return { applied: false, reason: "amount-mismatch" };
  }

  // A genuine SUCCESS may arrive after an earlier failed/dropped attempt on the
  // same Cashfree order, so it can promote a FAILED/CANCELLED row too. Every
  // other status only ever transitions a still-PENDING row — a late FAILED must
  // never overwrite a SUCCESS.
  const promotableFrom: PurchaseStatus[] =
    result.status === "SUCCESS" ? PROMOTABLE_TO_SUCCESS : ["PENDING"];

  const { count } = await prisma.$transaction(async (tx) => {
    // Conditional update IS the lock: only a row in an allowed prior state transitions.
    const updateResult = await tx.purchase.updateMany({
      where: { id: purchase.id, status: { in: promotableFrom } },
      data: {
        status: result.status,
        providerPaymentId: result.providerPaymentId,
        paymentMethod: result.paymentMethod,
        // On SUCCESS, wipe any failure detail left by an earlier failed attempt
        // on the same order; otherwise record this result's failure detail.
        failureCode: result.status === "SUCCESS" ? null : result.failureCode,
        failureReason: result.status === "SUCCESS" ? null : result.failureReason,
        // Any earlier hold (e.g. a since-resolved amount mismatch) no longer
        // applies once we've actually reached a terminal status here.
        heldForReview: false,
      },
    });

    if (updateResult.count > 0 && result.status === "SUCCESS" && purchase.couponId) {
      await tx.coupon.update({
        where: { id: purchase.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return updateResult;
  });

  if (count === 0) {
    return { applied: false, reason: "already-finalized" };
  }

  if (result.status === "SUCCESS") {
    await ensureInvoice(purchase.id);
    // Notification failure must never invalidate a successful payment —
    // sendMentorshipPurchaseNotifications never throws (internally try/caught).
    await sendMentorshipPurchaseNotifications(purchase.id);
  }

  return { applied: true };
}

async function finalizeRefund(purchaseId: string, result: CallbackResult): Promise<FinalizeOutcome> {
  const { count } = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.purchase.updateMany({
      where: { id: purchaseId, status: "SUCCESS" },
      data: { status: "REFUNDED", refundedAt: new Date() },
    });

    if (updateResult.count > 0) {
      const purchase = await tx.purchase.findUniqueOrThrow({ where: { id: purchaseId } });
      if (purchase.couponId) {
        await tx.coupon.update({
          where: { id: purchase.couponId },
          data: { usedCount: { decrement: 1 } },
        });
        // Floor at 0 — a coupon can't go negative if usedCount was already 0
        // (e.g. a second refund event, or usage predates this accounting).
        await tx.coupon.updateMany({
          where: { id: purchase.couponId, usedCount: { lt: 0 } },
          data: { usedCount: 0 },
        });
      }
    }

    return updateResult;
  });

  void result;
  return count > 0 ? { applied: true } : { applied: false, reason: "already-finalized" };
}

/**
 * Idempotent and independently retryable — safe to call again if a previous
 * attempt generated the PDF but failed to upload it (or vice versa). Reuses
 * the same invoiceSeq/invoiceNumber across retries so Cloudinary's overwrite
 * just replaces the same object.
 */
export async function ensureInvoice(purchaseId: string): Promise<void> {
  const existing = await prisma.invoice.findUnique({ where: { purchaseId } });
  if (existing && existing.filePath) return;

  const purchase = await prisma.purchase.findUniqueOrThrow({
    where: { id: purchaseId },
    include: { user: true, questionBank: true },
  });

  const invoiceRow =
    existing ??
    (await prisma.invoice.create({
      data: {
        purchaseId,
        invoiceNumber: `PENDING-${purchaseId}`,
        filePath: "",
        amount: purchase.amount,
      },
    }));

  const invoiceNumber = invoiceRow.invoiceNumber.startsWith("PENDING-")
    ? `INV-${invoiceRow.issuedAt.getFullYear()}-${String(invoiceRow.invoiceSeq).padStart(6, "0")}`
    : invoiceRow.invoiceNumber;

  const pdfBytes = await generateInvoicePdf({
    invoiceNumber,
    issuedAt: invoiceRow.issuedAt,
    buyerName: purchase.user.name,
    buyerEmail: purchase.user.email,
    buyerPhone: purchase.user.phone,
    itemTitle: purchase.questionBank.title,
    basePrice: purchase.basePriceSnapshot,
    discountAmount: purchase.discountAmount,
    couponCode: purchase.couponCodeSnapshot,
    totalAmount: purchase.amount,
    paymentProvider: purchase.paymentProvider,
    orderId: purchase.providerOrderId,
    transactionId: purchase.providerPaymentId,
    paymentMethod: purchase.paymentMethod,
  });

  const filePath = await saveInvoiceFile(invoiceNumber, pdfBytes);

  await prisma.invoice.update({
    where: { id: invoiceRow.id },
    data: { invoiceNumber, filePath },
  });
}
