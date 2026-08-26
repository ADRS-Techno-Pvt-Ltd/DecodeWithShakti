import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { resolveEffectivePrice, computeDiscount, isCouponUsable } from "@/lib/pricing";
import { getPaymentProvider } from "@/lib/payment";
import { z } from "zod";

const bodySchema = z.object({
  questionBankId: z.string().min(1),
  couponCode: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireStudent();
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { questionBankId, couponCode } = parsed.data;

    const bank = await prisma.questionBank.findUnique({ where: { id: questionBankId } });
    if (!bank || !bank.isPublished) {
      return NextResponse.json({ error: "Question bank not available." }, { status: 404 });
    }

    const alreadyOwned = await prisma.purchase.findFirst({
      where: { userId: session.user.id, questionBankId, status: "SUCCESS" },
    });
    if (alreadyOwned) {
      return NextResponse.json({ error: "You already own this question bank." }, { status: 409 });
    }

    const basePrice = resolveEffectivePrice(bank);
    let discountAmount = 0;
    let couponId: string | null = null;
    let couponCodeSnapshot: string | null = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase().trim() },
      });
      if (!coupon || !isCouponUsable(coupon)) {
        return NextResponse.json({ error: "This coupon code is invalid, expired, or exhausted." }, { status: 400 });
      }
      discountAmount = computeDiscount(basePrice, coupon);
      couponId = coupon.id;
      couponCodeSnapshot = coupon.code;
    }

    const amount = Math.max(basePrice - discountAmount, 100); // never below Rs.1 (paise)
    const provider = getPaymentProvider();

    const purchase = await prisma.purchase.create({
      data: {
        userId: session.user.id,
        questionBankId,
        basePriceSnapshot: basePrice,
        couponId,
        couponCodeSnapshot,
        discountAmount,
        amount,
        status: "PENDING",
        paymentProvider: provider.name,
        providerOrderId: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
    });

    const orderResult = await provider.createOrder({
      id: purchase.id,
      amount,
      userEmail: session.user.email ?? "",
      questionBankTitle: bank.title,
    });

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { providerOrderId: orderResult.providerOrderId },
    });

    return NextResponse.json({ redirectUrl: orderResult.redirectUrl, purchaseId: purchase.id });
  } catch (err) {
    return toErrorResponse(err);
  }
}
