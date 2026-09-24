import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { saveFreeResourceFile } from "@/lib/storage";
import { thumbnailUrlFor } from "@/lib/thumbnail";

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.freeResource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Free resource not found." }, { status: 404 });
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
    const filePath = await saveFreeResourceFile(id, bytes);

    const updated = await prisma.freeResource.update({
      where: { id },
      data: { filePath, fileName: file.name, fileSizeBytes: file.size },
      include: { category: true, subject: true },
    });

    const { thumbnailPath, ...resourceDto } = updated;
    return NextResponse.json({ ...resourceDto, thumbnailUrl: thumbnailUrlFor(thumbnailPath) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
