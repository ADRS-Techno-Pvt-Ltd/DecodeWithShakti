import { NextResponse } from "next/server";
import { z } from "zod";
import { ProductType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { resolveEffectivePrice, isCouponUsable } from "@/lib/pricing";
import { computeCartPricing, type PromotionRule } from "@/lib/pricing/cart-pricing";

const bodySchema = z.object({
  questionBankIds: z.array(z.string().min(1)).min(1, "Cart is empty."),
  couponCode: z.string().optional(),
});

/**
 * Read-only. Never writes to the DB — re-derives current DB prices + live
 * PromotionSetting rows and returns the authoritative discount breakdown for
 * the cart page's live preview. The actual charge is always recomputed again,
 * independently, by POST /api/v1/cart/create-order at checkout time.
 *
 * Response shape:
 * {
 *   subtotal: number;                     // paise
 *   couponDiscountAmount: number;         // paise
 *   bundleDiscountAmount: number;         // paise
 *   bundleDiscountPercentApplied: number; // 0-100
 *   total: number;                        // paise
 *   items: { questionBankId: string; title: string; thumbnailPath: string | null; basePrice: number; amount: number }[];
 * }
 * Error responses: { error: string | ZodFlattenedError }
 */
export async function POST(request: Request) {
  try {
    await requireStudent();
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { couponCode } = parsed.data;
    const questionBankIds = [...new Set(parsed.data.questionBankIds)];

    const banks = await prisma.questionBank.findMany({
      where: { id: { in: questionBankIds }, isPublished: true },
    });
    const banksById = new Map(banks.map((b) => [b.id, b]));
    // Silently drop items that no longer exist/are unpublished rather than
    // erroring — this is a preview, the cart UI can reconcile stale ids.
    const orderedBanks = questionBankIds.map((id) => banksById.get(id)).filter((b): b is NonNullable<typeof b> => !!b);

    if (orderedBanks.length === 0) {
      return NextResponse.json({ error: "None of the items in your cart are available." }, { status: 404 });
    }

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

    const pricingItems = orderedBanks.map((bank) => ({
      basePrice: resolveEffectivePrice(bank),
      productType: bank.type,
    }));
    const subtotal = pricingItems.reduce((sum, item) => sum + item.basePrice, 0);

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
      couponForPricing = { discountType: coupon.discountType, discountValue: coupon.discountValue };
    }

    const pricing = computeCartPricing(pricingItems, promotionsByType, couponForPricing);

    const items = orderedBanks.map((bank, i) => ({
      questionBankId: bank.id,
      title: bank.title,
      thumbnailPath: bank.thumbnailPath,
      basePrice: pricingItems[i].basePrice,
      amount: pricing.perItemAmounts[i],
    }));

    return NextResponse.json({
      subtotal: pricing.subtotal,
      couponDiscountAmount: pricing.couponDiscountAmount,
      bundleDiscountAmount: pricing.bundleDiscountAmount,
      bundleDiscountPercentApplied: pricing.bundleDiscountPercentApplied,
      total: pricing.total,
      items,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
