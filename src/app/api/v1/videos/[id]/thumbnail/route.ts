import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { saveVideoThumbnailFile } from "@/lib/storage";
import { extForThumbnailMime, MAX_THUMBNAIL_BYTES, videoThumbnailUrlFor } from "@/lib/thumbnail";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.video.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
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
    const savedThumbnailPath = await saveVideoThumbnailFile(id, bytes);

    const updated = await prisma.video.update({
      where: { id },
      data: { thumbnailPath: savedThumbnailPath },
      include: { category: true },
    });

    const { thumbnailPath, youtubeVideoId, ...rest } = updated;
    return NextResponse.json({
      ...rest,
      youtubeVideoId,
      thumbnailUrl: videoThumbnailUrlFor(thumbnailPath, youtubeVideoId),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
