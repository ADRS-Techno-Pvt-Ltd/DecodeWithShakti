import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { getPaymentProvider } from "@/lib/payment";
import { finalizePurchase } from "@/lib/payment/finalize-purchase";

/** Fallback status check — covers the case where a callback/webhook hasn't landed yet. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await requireStudent();
    const { orderId } = await params;

    const purchase = await prisma.purchase.findUnique({ where: { id: orderId } });
    if (!purchase || purchase.userId !== session.user.id) {
      return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
    }

    if (purchase.status === "PENDING") {
      const provider = getPaymentProvider();
      const result = await provider.handleCallback({ providerOrderId: purchase.providerOrderId });
      await finalizePurchase(result);
    }

    const updated = await prisma.purchase.findUnique({ where: { id: orderId } });
    return NextResponse.json({ status: updated?.status });
  } catch (err) {
    return toErrorResponse(err);
  }
}
