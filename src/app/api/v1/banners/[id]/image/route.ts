import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { saveBannerImageFile } from "@/lib/storage";
import { extForThumbnailMime, MAX_THUMBNAIL_BYTES } from "@/lib/thumbnail";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Banner not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "A banner image is required." }, { status: 400 });
    }

    const ext = extForThumbnailMime(image.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Banner image must be a JPEG, PNG, or WebP image." },
        { status: 400 },
      );
    }
    if (image.size > MAX_THUMBNAIL_BYTES) {
      return NextResponse.json({ error: "Banner image exceeds the 5MB limit." }, { status: 400 });
    }

    const bytes = Buffer.from(await image.arrayBuffer());
    const imagePath = await saveBannerImageFile(id, bytes);

    const updated = await prisma.banner.update({ where: { id }, data: { imagePath } });
    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}
