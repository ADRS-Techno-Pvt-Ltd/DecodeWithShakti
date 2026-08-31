import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { bannerUpdateSchema } from "@/lib/validation/banner";
import { deleteBannerImageFile } from "@/lib/storage";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const raw = await request.json();
    const parsed = bannerUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { linkUrl, ...rest } = parsed.data;

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        ...rest,
        ...(linkUrl !== undefined ? { linkUrl: linkUrl || null } : {}),
      },
    });
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

    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Banner not found." }, { status: 404 });
    }

    await prisma.banner.delete({ where: { id } });
    await deleteBannerImageFile(id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
