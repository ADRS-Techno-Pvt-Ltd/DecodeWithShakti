import { prisma } from "@/lib/prisma";
import { ensureInvoice } from "./finalize-purchase";
import { sendMentorshipPurchaseNotifications } from "./mentorship-notifications";
import type { CallbackResult } from "./provider";

export type FinalizeOutcome =
  | { applied: true }
  | { applied: false; reason: "still-pending" | "unknown-order" | "amount-mismatch" | "already-finalized" };

/**
 * Idempotent Order finalization — the multi-item counterpart to
 * finalizePurchase() in finalize-purchase.ts. Structural mirror: same
 * amount-mismatch-before-granting-anything guard (checked against
 * Order.amount), same conditional-update-as-lock idempotency, but on success
 * flips every child Purchase row (Purchase.orderId === order.id) to SUCCESS
 * in one transaction, then generates an invoice per child Purchase and sends
 * mentorship notifications for any mentorship-typed child. Refunds are
 * whole-order only for v1 — see docs/bundle-discount-plan.md § F.
 */
export async function finalizeOrder(result: CallbackResult): Promise<FinalizeOutcome> {
  if (result.status === "PENDING") {
    return { applied: false, reason: "still-pending" };
  }

  const order = await prisma.order.findUnique({
    where: { providerOrderId: result.providerOrderId },
  });
  if (!order) {
    return { applied: false, reason: "unknown-order" };
  }

  if (result.status === "REFUNDED") {
    return finalizeOrderRefund(order.id, result);
  }

  // Amount check BEFORE granting anything — a mismatched SUCCESS is held for
  // review, never auto-finalized. Order (and its child Purchases) stay PENDING.
  if (
    result.status === "SUCCESS" &&
    result.paidAmount != null &&
    result.paidAmount !== order.amount
  ) {
    if (order.status === "PENDING") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          heldForReview: true,
          failureCode: "amount_mismatch",
          failureReason: `Paid ${result.paidAmount} paise, expected ${order.amount} paise.`,
        },
      });
    }
    return { applied: false, reason: "amount-mismatch" };
  }

  const { count } = await prisma.$transaction(async (tx) => {
    // Conditional update IS the lock: only an order still PENDING transitions.
    const updateResult = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: {
        status: result.status,
        providerPaymentId: result.providerPaymentId,
        paymentMethod: result.paymentMethod,
        failureCode: result.failureCode,
        failureReason: result.failureReason,
        heldForReview: false,
      },
    });

    if (updateResult.count > 0) {
      await tx.purchase.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: {
          status: result.status,
          providerPaymentId: result.providerPaymentId,
          paymentMethod: result.paymentMethod,
          failureCode: result.failureCode,
          failureReason: result.failureReason,
          heldForReview: false,
        },
      });

      if (result.status === "SUCCESS" && order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    return updateResult;
  });

  if (count === 0) {
    return { applied: false, reason: "already-finalized" };
  }

  if (result.status === "SUCCESS") {
    const childPurchases = await prisma.purchase.findMany({
      where: { orderId: order.id },
      include: { questionBank: true },
    });

    for (const purchase of childPurchases) {
      await ensureInvoice(purchase.id);
      if (purchase.questionBank.type === "MENTORSHIP") {
        // Notification failure must never invalidate a successful payment —
        // sendMentorshipPurchaseNotifications never throws (internally try/caught).
        await sendMentorshipPurchaseNotifications(purchase.id);
      }
    }
  }

  return { applied: true };
}

async function finalizeOrderRefund(orderId: string, result: CallbackResult): Promise<FinalizeOutcome> {
  const { count } = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.order.updateMany({
      where: { id: orderId, status: "SUCCESS" },
      data: { status: "REFUNDED", refundedAt: new Date() },
    });

    if (updateResult.count > 0) {
      // Whole-order refund: every child Purchase flips to REFUNDED together —
      // per-item refunds are explicitly deferred (plan § F).
      await tx.purchase.updateMany({
        where: { orderId, status: "SUCCESS" },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });

      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { decrement: 1 } },
        });
        // Floor at 0 — a coupon can't go negative if usedCount was already 0
        // (e.g. a second refund event, or usage predates this accounting).
        await tx.coupon.updateMany({
          where: { id: order.couponId, usedCount: { lt: 0 } },
          data: { usedCount: 0 },
        });
      }
    }

    return updateResult;
  });

  void result;
  return count > 0 ? { applied: true } : { applied: false, reason: "already-finalized" };
}
