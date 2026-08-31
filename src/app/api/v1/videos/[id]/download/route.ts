import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { getSignedVideoDownloadUrl } from "@/lib/storage";
import { slugify } from "@/lib/slug";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Free-for-all-students: any authenticated session may download a published video.
    await requireSession();
    const { id } = await params;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || !video.isPublished) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }
    if (video.sourceType !== "UPLOAD" || !video.videoPath) {
      return NextResponse.json(
        { error: "This video is hosted on YouTube — watch it there to save a copy." },
        { status: 400 },
      );
    }

    const url = getSignedVideoDownloadUrl(video.videoPath, slugify(video.title));
    return NextResponse.redirect(url);
  } catch (err) {
    return toErrorResponse(err);
  }
}
