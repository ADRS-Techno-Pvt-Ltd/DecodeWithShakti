import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { bannerInputSchema } from "@/lib/validation/banner";
import { saveBannerImageFile } from "@/lib/storage";
import { extForThumbnailMime, MAX_THUMBNAIL_BYTES } from "@/lib/thumbnail";

/**
 * Public by default — returns published banners in display order for the homepage
 * carousel. `?admin=true` requires admin and returns every banner for the admin panel.
 */
export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get("admin") === "true";
    if (admin) {
      await requireAdmin();
      const banners = await prisma.banner.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      return NextResponse.json(banners);
    }

    const banners = await prisma.banner.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(banners);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

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

    const raw = Object.fromEntries(formData.entries());
    const parsed = bannerInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const input = parsed.data;

    const sortOrder =
      ((await prisma.banner.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1;

    const banner = await prisma.banner.create({
      data: {
        imagePath: "", // set below once we know the id
        linkUrl: input.linkUrl || null,
        altText: input.altText,
        isPublished: input.isPublished,
        sortOrder,
      },
    });

    const bytes = Buffer.from(await image.arrayBuffer());
    const imagePath = await saveBannerImageFile(banner.id, bytes);

    const updated = await prisma.banner.update({ where: { id: banner.id }, data: { imagePath } });
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
