import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { deleteAnswerKeyFiles, saveAnswerKeyFile } from "@/lib/storage";
import { readPdfUpload } from "@/features/answer-sheets/validation";

/** Replace one answer key's PDF content in place — its id and download link are unchanged. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const answerKey = await prisma.answerKey.findUnique({ where: { id }, select: { id: true } });
    if (!answerKey) return NextResponse.json({ error: "Answer key not found." }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file");
    const bytes = await readPdfUpload(file);
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }

    const filePath = await saveAnswerKeyFile(id, bytes);
    const updated = await prisma.answerKey.update({
      where: { id },
      data: { filePath, fileName: file.name, fileSizeBytes: file.size },
    });

    return NextResponse.json({ id: updated.id, title: updated.title, fileName: updated.fileName });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("PDF") || error.message.includes("file"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const answerKey = await prisma.answerKey.findUnique({ where: { id }, select: { id: true } });
    if (!answerKey) return NextResponse.json({ error: "Answer key not found." }, { status: 404 });

    await prisma.answerKey.delete({ where: { id } });
    await deleteAnswerKeyFiles(id).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
