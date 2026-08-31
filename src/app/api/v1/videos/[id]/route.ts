import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession, toErrorResponse } from "@/lib/auth-guards";
import { videoUpdateSchema } from "@/lib/validation/video";
import { extractYouTubeId } from "@/lib/youtube";
import { deleteVideoFiles } from "@/lib/storage";
import { videoThumbnailUrlFor } from "@/lib/thumbnail";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;

    const video = await prisma.video.findUnique({ where: { id }, include: { category: true } });
    if (!video) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }

    const { thumbnailPath, youtubeVideoId, ...rest } = video;
    return NextResponse.json({
      ...rest,
      youtubeVideoId,
      thumbnailUrl: videoThumbnailUrlFor(thumbnailPath, youtubeVideoId),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.video.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }

    const raw = await request.json();
    const parsed = videoUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const input = parsed.data;

    let youtubeVideoId = existing.youtubeVideoId;
    if (input.youtubeUrl != null) {
      if (existing.sourceType !== "YOUTUBE") {
        return NextResponse.json(
          { error: "Only YouTube-sourced videos have a link to edit." },
          { status: 400 },
        );
      }
      const parsedId = extractYouTubeId(input.youtubeUrl);
      if (!parsedId) {
        return NextResponse.json({ error: "Enter a valid YouTube video URL." }, { status: 400 });
      }
      youtubeVideoId = parsedId;
    }

    const updated = await prisma.video.update({
      where: { id },
      data: {
        ...(input.title != null ? { title: input.title } : {}),
        ...(input.description != null ? { description: input.description } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        youtubeVideoId,
        ...(input.isPublished != null ? { isPublished: input.isPublished } : {}),
        ...(input.isFeatured != null ? { isFeatured: input.isFeatured } : {}),
      },
      include: { category: true },
    });

    const { thumbnailPath, youtubeVideoId: updatedYoutubeId, ...rest } = updated;
    return NextResponse.json({
      ...rest,
      youtubeVideoId: updatedYoutubeId,
      thumbnailUrl: videoThumbnailUrlFor(thumbnailPath, updatedYoutubeId),
    });
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

    const existing = await prisma.video.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }

    await prisma.video.delete({ where: { id } });
    if (existing.sourceType === "UPLOAD") {
      await deleteVideoFiles(id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
