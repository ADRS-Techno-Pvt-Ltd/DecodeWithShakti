import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";

/**
 * Minimal, read-only status endpoint for a multi-item `Order` — used by the
 * order-return page (`src/app/purchase/order/[orderId]/return/page.tsx`) to
 * poll status without trusting the payment redirect query string. Deliberately
 * does NOT call the payment provider or flip any status itself (that's Agent
 * 1's `finalize-order.ts`/webhook territory) — it only ever reads current DB
 * state, same contract as `GET /api/v1/purchase/verify/[orderId]` but scoped
 * to an `Order` + its child `Purchase` rows instead of a single `Purchase`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await requireStudent();
    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        purchases: {
          include: { questionBank: true, invoice: true },
        },
      },
    });
    if (!order || order.userId !== session.user.id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      failureCode: order.failureCode,
      failureReason: order.failureReason,
      items: order.purchases.map((purchase) => ({
        purchaseId: purchase.id,
        questionBankId: purchase.questionBankId,
        title: purchase.questionBank.title,
        slug: purchase.questionBank.slug,
        type: purchase.questionBank.type,
        amount: purchase.amount,
        status: purchase.status,
        invoiceId: purchase.invoice?.id ?? null,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
