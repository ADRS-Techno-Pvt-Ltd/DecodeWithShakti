import type { ProductType } from "@/generated/prisma/client";
import type { Coupon } from "@/lib/pricing";
import { computeDiscount } from "@/lib/pricing";

export type CartPricingItem = {
  basePrice: number;
  productType: ProductType;
};

export type PromotionRule = {
  multiItemDiscountEnabled: boolean;
  multiItemDiscountPercent: number;
  minQualifyingItems: number;
};

export type CartPricingResult = {
  subtotal: number;
  couponDiscountAmount: number;
  bundleDiscountAmount: number;
  bundleDiscountPercentApplied: number;
  total: number;
  perItemAmounts: number[];
};

/**
 * Authoritative multi-item pricing. Never trust client-supplied prices/totals —
 * this always recomputes from DB-sourced basePrice + live PromotionSetting rows.
 * See docs/bundle-discount-plan.md § B for the full rule set this implements.
 */
export function computeCartPricing(
  items: CartPricingItem[],
  promotionsByType: Map<ProductType, PromotionRule>,
  coupon?: Coupon,
): CartPricingResult {
  const subtotal = items.reduce((sum, item) => sum + item.basePrice, 0);

  // Coupons and the bundle discount are mutually exclusive for v1.
  let couponDiscountAmount = 0;
  if (coupon) {
    couponDiscountAmount = computeDiscount(subtotal, coupon);
  }

  let bundleDiscountPercentApplied = 0;
  if (!coupon && items.length >= 2) {
    const countsByType = new Map<ProductType, number>();
    for (const item of items) {
      countsByType.set(item.productType, (countsByType.get(item.productType) ?? 0) + 1);
    }
    const distinctTypes = [...countsByType.keys()];

    if (distinctTypes.length === 1) {
      // Same-type cart: use that type's own configured percentage, if enabled
      // and the distinct-SKU count meets its minQualifyingItems.
      const type = distinctTypes[0];
      const count = countsByType.get(type) ?? 0;
      const rule = promotionsByType.get(type);
      if (rule && rule.multiItemDiscountEnabled && count >= rule.minQualifyingItems) {
        bundleDiscountPercentApplied = rule.multiItemDiscountPercent;
      }
    } else if (distinctTypes.length >= 2) {
      // Mixed-type cart: the lower of the involved types' percentages. A type
      // with no row or a disabled toggle contributes 0%, dragging the min down.
      const percents = distinctTypes.map((type) => {
        const rule = promotionsByType.get(type);
        if (!rule || !rule.multiItemDiscountEnabled) return 0;
        return rule.multiItemDiscountPercent;
      });
      bundleDiscountPercentApplied = Math.min(...percents);
    }
  }

  const afterCoupon = subtotal - couponDiscountAmount;
  const bundleDiscountAmount =
    bundleDiscountPercentApplied > 0 ? Math.round((afterCoupon * bundleDiscountPercentApplied) / 100) : 0;

  const total = afterCoupon - bundleDiscountAmount;

  // Prorate each item's share of the final total, with a remainder-cent
  // adjustment on the last item so sum(perItemAmounts) === total exactly.
  const perItemAmounts: number[] = [];
  if (items.length === 0) {
    return {
      subtotal,
      couponDiscountAmount,
      bundleDiscountAmount,
      bundleDiscountPercentApplied,
      total,
      perItemAmounts,
    };
  }

  let allocated = 0;
  for (let i = 0; i < items.length; i++) {
    if (i === items.length - 1) {
      // Last item absorbs whatever remainder is left, guaranteeing exact sum.
      perItemAmounts.push(total - allocated);
      break;
    }
    const item = items[i];
    const share = subtotal > 0 ? Math.round((total * item.basePrice) / subtotal) : 0;
    perItemAmounts.push(share);
    allocated += share;
  }

  return {
    subtotal,
    couponDiscountAmount,
    bundleDiscountAmount,
    bundleDiscountPercentApplied,
    total,
    perItemAmounts,
  };
}
