import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { saveOriginalFile, savePreviewFile } from "@/lib/storage";
import { getPageCount, buildPreview } from "@/lib/preview";
import { thumbnailUrlFor } from "@/lib/thumbnail";

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024;

/**
 * Replaces the original PDF for an existing question bank — e.g. recovering from a
 * file that went missing in storage, or swapping in a corrected upload. Re-derives
 * totalPages and, if preview is enabled, regenerates the preview from the new file.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.questionBank.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Question bank not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the ${process.env.MAX_UPLOAD_MB ?? 50}MB limit.` },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const totalPages = await getPageCount(bytes);

    if (existing.previewEnabled && existing.previewPageCount != null && existing.previewPageCount > totalPages) {
      return NextResponse.json(
        {
          error: `The new file has only ${totalPages} pages, fewer than the configured preview page count (${existing.previewPageCount}). Update the preview page count first.`,
        },
        { status: 400 },
      );
    }

    const filePath = await saveOriginalFile(id, bytes);

    let previewFilePath = existing.previewFilePath;
    if (existing.previewEnabled && existing.previewPageCount) {
      const previewBytes = await buildPreview(bytes, existing.previewPageCount);
      previewFilePath = await savePreviewFile(id, previewBytes);
    }

    const updated = await prisma.questionBank.update({
      where: { id },
      data: {
        filePath,
        fileName: file.name,
        fileSizeBytes: file.size,
        totalPages,
        previewFilePath,
      },
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
