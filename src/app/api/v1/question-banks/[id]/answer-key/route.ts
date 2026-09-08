import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { readPdfUpload } from "@/features/answer-sheets/validation";
import { saveAnswerKeyFile } from "@/lib/storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const questionBank = await prisma.questionBank.findUnique({
      where: { id },
      select: { id: true, title: true, description: true, categoryId: true },
    });
    if (!questionBank) return NextResponse.json({ error: "Question bank not found." }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file");
    const bytes = await readPdfUpload(file);
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }

    const existing = await prisma.answerKey.findFirst({ where: { questionBankId: id }, select: { id: true } });
    const answerKey = existing
      ? await prisma.answerKey.update({
          where: { id: existing.id },
          data: {
            title: questionBank.title,
            description: questionBank.description,
            categoryId: questionBank.categoryId,
            fileName: file.name,
            fileSizeBytes: file.size,
          },
        })
      : await prisma.answerKey.create({
          data: {
            title: questionBank.title,
            description: questionBank.description,
            questionBankId: id,
            categoryId: questionBank.categoryId,
            filePath: "",
            fileName: file.name,
            fileSizeBytes: file.size,
            createdById: session.user.id,
          },
        });

    const filePath = await saveAnswerKeyFile(answerKey.id, bytes);
    await prisma.answerKey.update({ where: { id: answerKey.id }, data: { filePath } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("PDF") || error.message.includes("file"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}