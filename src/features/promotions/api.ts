export type ProductType = "QUESTION_BANK" | "TEST_SERIES" | "MENTORSHIP";

export type PromotionSetting = {
  id: string | null;
  productType: ProductType;
  multiItemDiscountEnabled: boolean;
  multiItemDiscountPercent: number;
  minQualifyingItems: number;
  updatedAt: string | null;
};

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (typeof body?.error === "string") {
      throw new Error(body.error);
    }
    const fieldError = Object.values(body?.error?.fieldErrors ?? {}).flat()[0];
    throw new Error(fieldError ?? body?.error?.formErrors?.[0] ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchPromotionSettings(): Promise<PromotionSetting[]> {
  return unwrap(await fetch("/api/v1/admin/promotion-setting"));
}

export type PromotionSettingInput = {
  productType: ProductType;
  multiItemDiscountEnabled: boolean;
  multiItemDiscountPercent: number;
  minQualifyingItems?: number;
};

export async function updatePromotionSetting(
  input: PromotionSettingInput,
): Promise<PromotionSetting> {
  return unwrap(
    await fetch("/api/v1/admin/promotion-setting", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}
