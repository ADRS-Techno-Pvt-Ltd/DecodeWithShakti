import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { validateCouponSchema } from "@/lib/validation/coupon";
import { resolveEffectivePrice, computeDiscount, isCouponUsable } from "@/lib/pricing";

export async function POST(request: Request) {
  try {
    await requireStudent();
    const raw = await request.json();
    const parsed = validateCouponSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const [coupon, bank] = await Promise.all([
      prisma.coupon.findUnique({ where: { code: parsed.data.code.toUpperCase().trim() } }),
      prisma.questionBank.findUnique({ where: { id: parsed.data.questionBankId } }),
    ]);

    if (!bank) {
      return NextResponse.json({ error: "Question bank not found." }, { status: 404 });
    }
    if (!coupon || !isCouponUsable(coupon)) {
      return NextResponse.json({ error: "This coupon code is invalid, expired, or exhausted." }, { status: 400 });
    }

    const effectivePrice = resolveEffectivePrice(bank);
    const discountAmount = computeDiscount(effectivePrice, coupon);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      basePrice: effectivePrice,
      discountAmount,
      finalAmount: effectivePrice - discountAmount,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
