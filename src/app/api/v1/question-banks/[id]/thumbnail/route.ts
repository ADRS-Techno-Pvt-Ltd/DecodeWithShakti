import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { saveThumbnailFile } from "@/lib/storage";
import { extForThumbnailMime, thumbnailUrlFor, MAX_THUMBNAIL_BYTES } from "@/lib/thumbnail";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.questionBank.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Question bank not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const thumbnail = formData.get("thumbnail");
    if (!(thumbnail instanceof File) || thumbnail.size === 0) {
      return NextResponse.json({ error: "A thumbnail image is required." }, { status: 400 });
    }

    const ext = extForThumbnailMime(thumbnail.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Thumbnail must be a JPEG, PNG, or WebP image." },
        { status: 400 },
      );
    }
    if (thumbnail.size > MAX_THUMBNAIL_BYTES) {
      return NextResponse.json({ error: "Thumbnail exceeds the 5MB limit." }, { status: 400 });
    }

    const bytes = Buffer.from(await thumbnail.arrayBuffer());
    const savedThumbnailPath = await saveThumbnailFile(id, bytes);

    const updated = await prisma.questionBank.update({
      where: { id },
      data: { thumbnailPath: savedThumbnailPath },
      include: { category: true },
    });

    const { thumbnailPath, ...bankDto } = updated;
    return NextResponse.json({
      ...bankDto,
      thumbnailUrl: thumbnailUrlFor(thumbnailPath),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
