import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession, toErrorResponse } from "@/lib/auth-guards";
import { videoInputSchema } from "@/lib/validation/video";
import { extractYouTubeId } from "@/lib/youtube";
import { saveVideoFile, saveVideoThumbnailFile } from "@/lib/storage";
import { uniqueSlug } from "@/lib/slug";
import { extForThumbnailMime, MAX_THUMBNAIL_BYTES, videoThumbnailUrlFor } from "@/lib/thumbnail";
import type { Prisma } from "@/generated/prisma/client";

const MAX_VIDEO_UPLOAD_BYTES = Number(process.env.MAX_VIDEO_MB ?? 200) * 1024 * 1024;

function toVideoDto(video: Prisma.VideoGetPayload<{ include: { category: true } }>) {
  const { thumbnailPath, youtubeVideoId, ...rest } = video;
  return {
    ...rest,
    youtubeVideoId,
    thumbnailUrl: videoThumbnailUrlFor(thumbnailPath, youtubeVideoId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin") === "true";

    if (admin) {
      await requireAdmin();
    } else {
      // Free-for-students catalog still requires a logged-in session — not a public page.
      await requireSession();
    }

    const videos = await prisma.video.findMany({
      where: admin ? {} : { isPublished: true },
      include: { category: true },
      orderBy: admin
        ? { createdAt: "desc" }
        : ([{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] as const),
    });

    return NextResponse.json(videos.map(toVideoDto));
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    return await createVideo(request);
  } catch (err) {
    return toErrorResponse(err);
  }
}

async function createVideo(request: Request) {
  await requireAdmin();

  const formData = await request.formData();
  const raw = Object.fromEntries(formData.entries());
  const parsed = videoInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  let file: File | null = null;
  if (input.sourceType === "UPLOAD") {
    const candidate = formData.get("file");
    if (!(candidate instanceof File) || candidate.size === 0) {
      return NextResponse.json({ error: "A video file is required." }, { status: 400 });
    }
    if (!candidate.type.startsWith("video/")) {
      return NextResponse.json({ error: "Only video files are accepted." }, { status: 400 });
    }
    if (candidate.size > MAX_VIDEO_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the ${process.env.MAX_VIDEO_MB ?? 200}MB limit.` },
        { status: 400 },
      );
    }
    file = candidate;
  }

  const thumbnail = formData.get("thumbnail");
  let thumbnailExt: string | null = null;
  if (thumbnail instanceof File && thumbnail.size > 0) {
    thumbnailExt = extForThumbnailMime(thumbnail.type);
    if (!thumbnailExt) {
      return NextResponse.json(
        { error: "Thumbnail must be a JPEG, PNG, or WebP image." },
        { status: 400 },
      );
    }
    if (thumbnail.size > MAX_THUMBNAIL_BYTES) {
      return NextResponse.json({ error: "Thumbnail exceeds the 5MB limit." }, { status: 400 });
    }
  }

  const youtubeVideoId = input.sourceType === "YOUTUBE" ? extractYouTubeId(input.youtubeUrl!) : null;
  const slug = uniqueSlug(input.title);

  const video = await prisma.video.create({
    data: {
      title: input.title,
      slug,
      description: input.description,
      categoryId: input.categoryId ?? null,
      sourceType: input.sourceType,
      youtubeVideoId,
      videoPath: null,
      fileSizeBytes: file?.size ?? null,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
    },
  });

  let videoPathValue: string | null = null;
  if (file) {
    const bytes = Buffer.from(await file.arrayBuffer());
    videoPathValue = await saveVideoFile(video.id, bytes);
  }

  let thumbnailPathValue: string | null = null;
  if (thumbnail instanceof File && thumbnailExt) {
    const thumbnailBytes = Buffer.from(await thumbnail.arrayBuffer());
    thumbnailPathValue = await saveVideoThumbnailFile(video.id, thumbnailBytes);
  }

  const updated = await prisma.video.update({
    where: { id: video.id },
    data: { videoPath: videoPathValue, thumbnailPath: thumbnailPathValue },
    include: { category: true },
  });

  return NextResponse.json(toVideoDto(updated), { status: 201 });
}
