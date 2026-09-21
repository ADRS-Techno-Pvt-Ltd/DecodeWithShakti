import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { deleteAnswerKeyFiles, saveAnswerKeyFile } from "@/lib/storage";
import { readPdfUpload, UploadValidationError } from "@/features/answer-sheets/validation";

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
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}

/** Link this answer key to one paper of its Test Series (or `null` to unlink it back to order-based matching). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { questionBankFileId?: unknown } | null;
    const paperId = body?.questionBankFileId;
    if (paperId !== null && typeof paperId !== "string") {
      return NextResponse.json({ error: "questionBankFileId must be a string or null." }, { status: 400 });
    }

    const answerKey = await prisma.answerKey.findUnique({ where: { id }, select: { questionBankId: true } });
    if (!answerKey) return NextResponse.json({ error: "Answer key not found." }, { status: 404 });
    if (paperId) {
      const paper = await prisma.questionBankFile.findFirst({
        where: { id: paperId, questionBankId: answerKey.questionBankId ?? "" },
        select: { id: true },
      });
      if (!paper) return NextResponse.json({ error: "Paper not found in this Test Series." }, { status: 400 });
    }

    await prisma.answerKey.update({ where: { id }, data: { questionBankFileId: paperId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
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
