import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ProductType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { resolveEffectivePrice, isCouponUsable } from "@/lib/pricing";
import { computeCartPricing, type PromotionRule } from "@/lib/pricing/cart-pricing";
import { getPaymentProvider } from "@/lib/payment";
import { finalizeOrder } from "@/lib/payment/finalize-order";

const PHONE_REGEX = /^[6-9]\d{9}$/;

const bodySchema = z.object({
  questionBankIds: z.array(z.string().min(1)).min(1, "Cart is empty."),
  couponCode: z.string().optional(),
  phone: z.string().regex(PHONE_REGEX, "Enter a valid 10-digit phone number.").optional(),
});

const ORDER_EXPIRY_MINUTES = Number(process.env.CASHFREE_ORDER_EXPIRY_MINUTES ?? "20");

/**
 * Response shape (both success paths):
 * {
 *   orderId: string;
 *   redirectUrl: string | null;
 *   sessionId: string | null;
 *   free: boolean;
 *   expiresAt: string; // ISO
 *   subtotal: number;                    // paise
 *   couponDiscountAmount: number;        // paise
 *   bundleDiscountAmount: number;        // paise
 *   bundleDiscountPercentApplied: number; // 0-100
 *   amount: number;                      // paise, authoritative total charged
 *   items: { questionBankId: string; title: string; basePrice: number; amount: number }[];
 * }
 * Error responses: { error: string | ZodFlattenedError }
 */
export async function POST(request: Request) {
  try {
    if (!process.env.NEXTAUTH_URL || !/^https?:\/\//.test(process.env.NEXTAUTH_URL)) {
      console.error("cart/create-order: NEXTAUTH_URL is not set to a valid absolute URL.");
      return NextResponse.json({ error: "Server misconfigured. Please contact support." }, { status: 500 });
    }

    const session = await requireStudent();
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { couponCode, phone } = parsed.data;
    const questionBankIds = [...new Set(parsed.data.questionBankIds)];

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    const effectivePhone = user.phone ?? phone;
    if (!effectivePhone) {
      return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });
    }
    if (!user.phone && phone) {
      await prisma.user.update({ where: { id: user.id }, data: { phone } });
    }

    const banks = await prisma.questionBank.findMany({
      where: { id: { in: questionBankIds }, isPublished: true },
    });
    if (banks.length !== questionBankIds.length) {
      return NextResponse.json({ error: "One or more items in your cart are no longer available." }, { status: 404 });
    }
    // Preserve the requested order for deterministic proration/return payload.
    const banksById = new Map(banks.map((b) => [b.id, b]));

    // Reject the whole order if ANY single item is already owned (hard
    // requirement, plan § F) rather than silently dropping it.
    const alreadyOwned = await prisma.purchase.findMany({
      where: { userId: session.user.id, questionBankId: { in: questionBankIds }, status: "SUCCESS" },
      include: { questionBank: true },
    });
    if (alreadyOwned.length > 0) {
      const titles = alreadyOwned.map((p) => p.questionBank.title).join(", ");
      return NextResponse.json(
        { error: `You already own: ${titles}. Remove ${alreadyOwned.length > 1 ? "them" : "it"} from your cart and try again.` },
        { status: 409 },
      );
    }

    // Reap this user's own stale PENDING rows for these items before creating
    // a new order, so retries don't pile up orphaned rows.
    await prisma.purchase.updateMany({
      where: {
        userId: session.user.id,
        questionBankId: { in: questionBankIds },
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });
    await prisma.order.updateMany({
      where: { userId: session.user.id, status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });

    // Load PromotionSetting for every ProductType, defaulting any missing row
    // to disabled/0% (plan § F: a type without a row must never silently qualify).
    const promotionRows = await prisma.promotionSetting.findMany();
    const promotionsByType = new Map<ProductType, PromotionRule>();
    for (const type of Object.values(ProductType)) {
      const row = promotionRows.find((r) => r.productType === type);
      promotionsByType.set(type, {
        multiItemDiscountEnabled: row?.multiItemDiscountEnabled ?? false,
        multiItemDiscountPercent: row?.multiItemDiscountPercent ?? 0,
        minQualifyingItems: row?.minQualifyingItems ?? 2,
      });
    }

    const orderedBanks = questionBankIds.map((id) => banksById.get(id)!);
    const pricingItems = orderedBanks.map((bank) => ({
      basePrice: resolveEffectivePrice(bank),
      productType: bank.type,
    }));
    const subtotal = pricingItems.reduce((sum, item) => sum + item.basePrice, 0);

    let couponId: string | null = null;
    let couponCodeSnapshot: string | null = null;
    let couponForPricing: { discountType: "PERCENT" | "FLAT"; discountValue: number } | undefined;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase().trim() } });
      if (!coupon || !isCouponUsable(coupon)) {
        return NextResponse.json({ error: "This coupon code is invalid, expired, or exhausted." }, { status: 400 });
      }
      if (coupon.discountType === "FLAT" && subtotal < coupon.discountValue) {
        return NextResponse.json(
          {
            error: `This coupon requires a minimum cart value of ₹${(coupon.discountValue / 100).toFixed(0)}. Current cart total is ₹${(subtotal / 100).toFixed(0)}.`,
          },
          { status: 400 },
        );
      }
      couponId = coupon.id;
      couponCodeSnapshot = coupon.code;
      couponForPricing = { discountType: coupon.discountType, discountValue: coupon.discountValue };
    }

    const pricing = computeCartPricing(pricingItems, promotionsByType, couponForPricing);
    let { total, perItemAmounts } = pricing;

    // Same "never below Rs.1 unless fully free" clamp as the single-item flow,
    // applied at the order level with the delta absorbed by the last item so
    // the per-item amounts still sum exactly to the clamped total.
    const isFree = total <= 0;
    if (!isFree && total < 100) {
      const delta = 100 - total;
      perItemAmounts = [...perItemAmounts];
      perItemAmounts[perItemAmounts.length - 1] += delta;
      total = 100;
    }
    const amount = isFree ? 0 : total;

    const provider = getPaymentProvider();
    const orderId = randomUUID();
    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000);
    const paymentProviderName = isFree ? "free" : provider.name;

    const { order, items } = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          id: orderId,
          userId: session.user.id,
          status: "PENDING",
          paymentProvider: paymentProviderName,
          providerOrderId: orderId,
          subtotal: pricing.subtotal,
          couponId,
          couponCodeSnapshot,
          couponDiscountAmount: pricing.couponDiscountAmount,
          bundleDiscountPercentSnapshot: pricing.bundleDiscountPercentApplied,
          bundleDiscountAmount: pricing.bundleDiscountAmount,
          amount,
          expiresAt,
        },
      });

      const items = [];
      for (let i = 0; i < orderedBanks.length; i++) {
        const bank = orderedBanks[i];
        const basePriceSnapshot = pricingItems[i].basePrice;
        const itemAmount = perItemAmounts[i];

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            questionBankId: bank.id,
            basePriceSnapshot,
            amount: itemAmount,
          },
        });

        const purchase = await tx.purchase.create({
          data: {
            userId: session.user.id,
            questionBankId: bank.id,
            basePriceSnapshot,
            couponId,
            couponCodeSnapshot,
            discountAmount: Math.max(0, basePriceSnapshot - itemAmount),
            amount: itemAmount,
            status: "PENDING",
            paymentProvider: paymentProviderName,
            providerOrderId: `${order.id}:${bank.id}`,
            expiresAt,
            orderId: order.id,
          },
        });

        items.push({ questionBankId: bank.id, title: bank.title, basePrice: basePriceSnapshot, amount: itemAmount, purchaseId: purchase.id });
      }

      return { order, items };
    });

    // 100% discount — nothing to charge, so skip the payment gateway entirely
    // and grant access immediately, same idempotent path a real webhook uses.
    if (isFree) {
      await finalizeOrder({
        providerOrderId: order.providerOrderId,
        status: "SUCCESS",
        paymentMethod: "free",
        paidAmount: 0,
      });
      return NextResponse.json({
        orderId: order.id,
        redirectUrl: null,
        sessionId: null,
        free: true,
        expiresAt,
        subtotal: pricing.subtotal,
        couponDiscountAmount: pricing.couponDiscountAmount,
        bundleDiscountAmount: pricing.bundleDiscountAmount,
        bundleDiscountPercentApplied: pricing.bundleDiscountPercentApplied,
        amount,
        items,
      });
    }

    const combinedTitle =
      items.length === 1 ? items[0].title : `${items.length} items (${items.map((i) => i.title).join(", ")})`;

    try {
      const orderResult = await provider.createOrder({
        id: order.id,
        amount,
        userId: session.user.id,
        userName: user.name,
        userEmail: session.user.email ?? "",
        userPhone: effectivePhone,
        questionBankTitle: combinedTitle,
        returnUrl: `${process.env.NEXTAUTH_URL}/purchase/order/${order.id}/return`,
      });

      return NextResponse.json({
        orderId: order.id,
        redirectUrl: orderResult.redirectUrl ?? null,
        sessionId: orderResult.sessionId ?? null,
        free: false,
        expiresAt,
        subtotal: pricing.subtotal,
        couponDiscountAmount: pricing.couponDiscountAmount,
        bundleDiscountAmount: pricing.bundleDiscountAmount,
        bundleDiscountPercentApplied: pricing.bundleDiscountPercentApplied,
        amount,
        items,
      });
    } catch (err) {
      const providerDetail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : undefined;
      const detail = providerDetail ? JSON.stringify(providerDetail) : undefined;
      console.error("cart/create-order: provider.createOrder() failed", err, providerDetail);

      const failureCode = "order_creation_failed";
      const failureReason = detail ?? (err instanceof Error ? err.message : "Could not start payment.");
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "FAILED", failureCode, failureReason },
      });
      await prisma.purchase.updateMany({
        where: { orderId: order.id },
        data: { status: "FAILED", failureCode, failureReason },
      });
      return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 502 });
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
