import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { healPurchase } from "@/lib/payment/heal";

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

    // Re-ask the provider and finalize if it moved. Rate-limited + idempotent
    // inside healPurchase; covers PENDING and a retried FAILED/CANCELLED.
    await healPurchase(purchaseId);

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
