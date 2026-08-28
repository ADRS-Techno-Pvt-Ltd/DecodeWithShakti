import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { resolveEffectivePrice, computeDiscount, isCouponUsable } from "@/lib/pricing";
import { getPaymentProvider } from "@/lib/payment";
import { z } from "zod";

const PHONE_REGEX = /^[6-9]\d{9}$/;

const bodySchema = z.object({
  questionBankId: z.string().min(1),
  couponCode: z.string().optional(),
  phone: z.string().regex(PHONE_REGEX, "Enter a valid 10-digit phone number.").optional(),
});

const ORDER_EXPIRY_MINUTES = Number(process.env.CASHFREE_ORDER_EXPIRY_MINUTES ?? "20");

export async function POST(request: Request) {
  try {
    if (!process.env.NEXTAUTH_URL || !/^https?:\/\//.test(process.env.NEXTAUTH_URL)) {
      // Fails fast with a clear cause instead of building "undefined/purchase/.../return"
      // and letting the payment provider reject it opaquely (e.g. Cashfree's
      // order_meta.return_url_invalid, which took real diagnosis to trace back to this).
      console.error("create-order: NEXTAUTH_URL is not set to a valid absolute URL.");
      return NextResponse.json({ error: "Server misconfigured. Please contact support." }, { status: 500 });
    }

    const session = await requireStudent();
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { questionBankId, couponCode, phone } = parsed.data;

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    const effectivePhone = user.phone ?? phone;
    if (!effectivePhone) {
      return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });
    }
    if (!user.phone && phone) {
      await prisma.user.update({ where: { id: user.id }, data: { phone } });
    }

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

    // Reap this user's own stale PENDING orders for this bank before creating
    // a new one, so retries don't pile up orphaned rows.
    await prisma.purchase.updateMany({
      where: {
        userId: session.user.id,
        questionBankId,
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

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
      
      // For FLAT discount coupons, reject if item price is less than the discount value
      if (coupon.discountType === "FLAT" && basePrice < coupon.discountValue) {
        return NextResponse.json({ 
          error: `This coupon requires a minimum purchase of ₹${(coupon.discountValue / 100).toFixed(0)}. Current item price is ₹${(basePrice / 100).toFixed(0)}.` 
        }, { status: 400 });
      }
      
      discountAmount = computeDiscount(basePrice, coupon);
      couponId = coupon.id;
      couponCodeSnapshot = coupon.code;
    }

    const amount = Math.max(basePrice - discountAmount, 100); // never below Rs.1 (paise)
    const provider = getPaymentProvider();

    // Purchase.id doubles as the provider's order_id — generated up front so
    // there is never a window where a webhook could arrive for an order id
    // not yet written to the DB (see docs/CASHFREE-PLAN.md § 6).
    const purchaseId = randomUUID();
    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000);

    const purchase = await prisma.purchase.create({
      data: {
        id: purchaseId,
        userId: session.user.id,
        questionBankId,
        basePriceSnapshot: basePrice,
        couponId,
        couponCodeSnapshot,
        discountAmount,
        amount,
        status: "PENDING",
        paymentProvider: provider.name,
        providerOrderId: purchaseId,
        expiresAt,
      },
    });

    try {
      const orderResult = await provider.createOrder({
        id: purchase.id,
        amount,
        userId: session.user.id,
        userName: user.name,
        userEmail: session.user.email ?? "",
        userPhone: effectivePhone,
        questionBankTitle: bank.title,
        returnUrl: `${process.env.NEXTAUTH_URL}/purchase/${purchase.id}/return`,
      });

      return NextResponse.json({
        purchaseId: purchase.id,
        redirectUrl: orderResult.redirectUrl ?? null,
        sessionId: orderResult.sessionId ?? null,
        expiresAt,
      });
    } catch (err) {
      // The cashfree-pg SDK throws AxiosErrors — err.message alone is just
      // "Request failed with status code 400", which isn't enough to diagnose
      // without reproducing the request by hand. Capture the provider's own
      // error body (code/message/type) when present, so it's visible directly
      // on the Purchase row instead of needing to reverse-engineer it later.
      const providerDetail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : undefined;
      const detail = providerDetail ? JSON.stringify(providerDetail) : undefined;
      console.error("create-order: provider.createOrder() failed", err, providerDetail);

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: "FAILED",
          failureCode: "order_creation_failed",
          failureReason: detail ?? (err instanceof Error ? err.message : "Could not start payment."),
        },
      });
      return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 502 });
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
