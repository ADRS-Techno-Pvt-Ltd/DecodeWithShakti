import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { couponInputSchema } from "@/lib/validation/coupon";

export async function GET() {
  try {
    await requireAdmin();
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(coupons);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const raw = await request.json();
    const parsed = couponInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.coupon.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return NextResponse.json({ error: "A coupon with this code already exists." }, { status: 409 });
    }

    const coupon = await prisma.coupon.create({ data: parsed.data });
    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
