import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { couponInputSchema } from "@/lib/validation/coupon";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const raw = await request.json();
    const parsed = couponInputSchema.partial().safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.coupon.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const usageCount = await prisma.purchase.count({ where: { couponId: id } });
    if (usageCount > 0) {
      return NextResponse.json(
        { error: "This coupon has been used and cannot be deleted. Deactivate it instead." },
        { status: 409 },
      );
    }

    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
