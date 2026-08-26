export type PricedQuestionBank = {
  price: number;
  earlyBirdPrice: number | null;
  earlyBirdEndsAt: Date | null;
};

/** All amounts are integers in paise. */
export function resolveEffectivePrice(bank: PricedQuestionBank, now: Date = new Date()): number {
  if (bank.earlyBirdPrice != null && bank.earlyBirdEndsAt != null && now < bank.earlyBirdEndsAt) {
    return bank.earlyBirdPrice;
  }
  return bank.price;
}

export type Coupon = {
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
};

/** Computes the discount amount (paise) for a given base price. Never returns a negative amount, never exceeds the base price. */
export function computeDiscount(basePrice: number, coupon: Coupon): number {
  const raw =
    coupon.discountType === "PERCENT"
      ? Math.round((basePrice * coupon.discountValue) / 100)
      : coupon.discountValue;
  return Math.min(Math.max(raw, 0), basePrice);
}

export function isCouponUsable(
  coupon: { isActive: boolean; expiresAt: Date; usageLimit: number; usedCount: number },
  now: Date = new Date(),
): boolean {
  return coupon.isActive && now < coupon.expiresAt && coupon.usedCount < coupon.usageLimit;
}
