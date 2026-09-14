import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { readPdfUpload } from "@/features/answer-sheets/validation";
import { saveQuestionBankPaperFile, deleteQuestionBankPaperFile } from "@/lib/storage";
import { syncQuestionBankPrimaryFile } from "@/lib/question-bank-files";

/** Replace one paper's PDF content in place — its id, download link and position are unchanged. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    await requireAdmin();
    const { id, fileId } = await params;
    const existing = await prisma.questionBankFile.findUnique({
      where: { id: fileId },
      select: { id: true, questionBankId: true },
    });
    if (!existing || existing.questionBankId !== id) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const bytes = await readPdfUpload(file);
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }

    const filePath = await saveQuestionBankPaperFile(id, fileId, bytes);
    const updated = await prisma.questionBankFile.update({
      where: { id: fileId },
      data: { filePath, fileName: file.name, fileSizeBytes: file.size },
    });

    await syncQuestionBankPrimaryFile(id);

    return NextResponse.json({ id: updated.id, fileName: updated.fileName, fileSizeBytes: updated.fileSizeBytes });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("PDF") || error.message.includes("file"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    await requireAdmin();
    const { id, fileId } = await params;
    const existing = await prisma.questionBankFile.findUnique({
      where: { id: fileId },
      select: { id: true, questionBankId: true, filePath: true },
    });
    if (!existing || existing.questionBankId !== id) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    await prisma.questionBankFile.delete({ where: { id: fileId } });
    await deleteQuestionBankPaperFile(existing.filePath).catch(() => undefined);
    await syncQuestionBankPrimaryFile(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
