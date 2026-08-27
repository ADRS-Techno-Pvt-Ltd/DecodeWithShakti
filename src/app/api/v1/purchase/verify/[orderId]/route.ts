import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { getPaymentProvider } from "@/lib/payment";
import { finalizePurchase } from "@/lib/payment/finalize-purchase";

/** Minimum gap between provider polls for the same purchase — Cashfree's own
 *  guidance is "poll every 3-5s, not faster" (common-mistakes §F2). Cheap
 *  in-memory throttle; fine to reset on redeploy, this is a rate limit, not a lock. */
const MIN_POLL_INTERVAL_MS = 3000;
const lastPolledAt = new Map<string, number>();

/** Fallback status check — covers the case where a webhook/callback hasn't landed yet. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await requireStudent();
    const { orderId: purchaseId } = await params;

    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase || purchase.userId !== session.user.id) {
      return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
    }

    if (purchase.status === "PENDING" && !purchase.heldForReview) {
      const now = Date.now();
      const last = lastPolledAt.get(purchaseId) ?? 0;
      if (now - last >= MIN_POLL_INTERVAL_MS) {
        lastPolledAt.set(purchaseId, now);
        const provider = getPaymentProvider();
        const result = await provider.getOrderStatus(purchase.providerOrderId);
        await finalizePurchase(result);
      }
    }

    const updated = await prisma.purchase.findUniqueOrThrow({ where: { id: purchaseId } });
    return NextResponse.json({
      status: updated.status,
      failureCode: updated.failureCode,
      failureReason: updated.failureReason,
      heldForReview: updated.heldForReview,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
