import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { readPdfUpload, UploadValidationError } from "@/features/answer-sheets/validation";
import { deleteAnswerKeyFiles, saveAnswerKeyFile } from "@/lib/storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const createdAnswerKeyIds: string[] = [];
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const questionBank = await prisma.questionBank.findUnique({
      where: { id },
      select: { id: true, title: true, description: true, categoryId: true, type: true },
    });
    if (!questionBank) return NextResponse.json({ error: "Question bank not found." }, { status: 404 });
    if (questionBank.type === "MENTORSHIP") {
      return NextResponse.json({ error: "Mentorship products do not have answer keys." }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) {
      return NextResponse.json({ error: "At least one PDF file is required." }, { status: 400 });
    }

    const rawPaperId = formData.get("questionBankFileId");
    const questionBankFileId = typeof rawPaperId === "string" && rawPaperId ? rawPaperId : null;
    if (questionBankFileId) {
      const paper = await prisma.questionBankFile.findFirst({
        where: { id: questionBankFileId, questionBankId: id },
        select: { id: true },
      });
      if (!paper) return NextResponse.json({ error: "Paper not found in this Test Series." }, { status: 400 });
    }

    const created: { id: string; title: string; fileName: string }[] = [];
    for (const file of files) {
      const bytes = await readPdfUpload(file);
      const answerKey = await prisma.answerKey.create({
        data: {
          title: questionBank.title,
          description: questionBank.description,
          questionBankId: id,
          questionBankFileId,
          categoryId: questionBank.categoryId,
          filePath: "",
          fileName: file.name,
          fileSizeBytes: file.size,
          createdById: session.user.id,
        },
      });
      createdAnswerKeyIds.push(answerKey.id);
      const filePath = await saveAnswerKeyFile(answerKey.id, bytes);
      await prisma.answerKey.update({ where: { id: answerKey.id }, data: { filePath } });
      created.push({ id: answerKey.id, title: answerKey.title, fileName: answerKey.fileName });
    }

    return NextResponse.json({ ok: true, answerKeys: created });
  } catch (error) {
    for (const answerKeyId of createdAnswerKeyIds) {
      await prisma.answerKey.delete({ where: { id: answerKeyId } }).catch(() => undefined);
      await deleteAnswerKeyFiles(answerKeyId).catch(() => undefined);
    }
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}
