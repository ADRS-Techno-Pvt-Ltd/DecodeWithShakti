import { NextResponse } from "next/server";
import { ProductType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { promotionSettingInputSchema } from "@/lib/validation/promotion-setting";

const ALL_PRODUCT_TYPES = Object.values(ProductType);

export async function GET() {
  try {
    await requireAdmin();
    const rows = await prisma.promotionSetting.findMany();
    const byType = new Map(rows.map((row) => [row.productType, row]));

    const result = ALL_PRODUCT_TYPES.map(
      (productType) =>
        byType.get(productType) ?? {
          id: null,
          productType,
          multiItemDiscountEnabled: false,
          multiItemDiscountPercent: 0,
          minQualifyingItems: 2,
          updatedAt: null,
        },
    );

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const raw = await request.json();
    const parsed = promotionSettingInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { productType, multiItemDiscountEnabled, multiItemDiscountPercent, minQualifyingItems } =
      parsed.data;

    const updated = await prisma.promotionSetting.upsert({
      where: { productType },
      update: {
        multiItemDiscountEnabled,
        multiItemDiscountPercent,
        ...(minQualifyingItems !== undefined ? { minQualifyingItems } : {}),
      },
      create: {
        productType,
        multiItemDiscountEnabled,
        multiItemDiscountPercent,
        ...(minQualifyingItems !== undefined ? { minQualifyingItems } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}
