import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { getSignedVideoUrl } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Free-for-all-students: any authenticated session may stream a published video.
    await requireSession();
    const { id } = await params;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || !video.isPublished) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }
    if (video.sourceType !== "UPLOAD" || !video.videoPath) {
      return NextResponse.json(
        { error: "This video is hosted on YouTube — use its embed link instead." },
        { status: 400 },
      );
    }

    const signed = getSignedVideoUrl(video.videoPath);
    return NextResponse.json(signed);
  } catch (err) {
    return toErrorResponse(err);
  }
}
