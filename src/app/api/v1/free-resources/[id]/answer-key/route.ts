import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { deleteFreeResourceAnswerKeyFile, saveFreeResourceAnswerKeyFile } from "@/lib/storage";
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
      return NextResponse.json({ error: "An answer key PDF is required." }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Answer key must be a PDF file." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Answer key exceeds the ${process.env.MAX_UPLOAD_MB ?? 50}MB limit.` },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const answerKeyFilePath = await saveFreeResourceAnswerKeyFile(id, bytes);

    const updated = await prisma.freeResource.update({
      where: { id },
      data: { answerKeyFilePath, answerKeyFileName: file.name, answerKeyFileSizeBytes: file.size },
      include: { category: true, subject: true },
    });

    const { thumbnailPath, ...resourceDto } = updated;
    return NextResponse.json({ ...resourceDto, thumbnailUrl: thumbnailUrlFor(thumbnailPath) });
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

    const existing = await prisma.freeResource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Free resource not found." }, { status: 404 });
    }
    if (!existing.answerKeyFilePath) {
      return NextResponse.json({ error: "No answer key to remove." }, { status: 400 });
    }

    await deleteFreeResourceAnswerKeyFile(id);
    const updated = await prisma.freeResource.update({
      where: { id },
      data: { answerKeyFilePath: null, answerKeyFileName: null, answerKeyFileSizeBytes: null },
      include: { category: true, subject: true },
    });

    const { thumbnailPath, ...resourceDto } = updated;
    return NextResponse.json({ ...resourceDto, thumbnailUrl: thumbnailUrlFor(thumbnailPath) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
