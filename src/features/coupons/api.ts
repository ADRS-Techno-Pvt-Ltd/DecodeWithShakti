export type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  expiresAt: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
};

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.formErrors?.[0] ?? body?.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchCoupons(): Promise<Coupon[]> {
  return unwrap(await fetch("/api/v1/coupons"));
}

export type CouponInput = {
  code: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  expiresAt: string;
  usageLimit: number;
  isActive: boolean;
};

export async function createCoupon(input: CouponInput): Promise<Coupon> {
  return unwrap(
    await fetch("/api/v1/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateCoupon(id: string, input: Partial<CouponInput>): Promise<Coupon> {
  return unwrap(
    await fetch(`/api/v1/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteCoupon(id: string): Promise<void> {
  await unwrap(await fetch(`/api/v1/coupons/${id}`, { method: "DELETE" }));
}
