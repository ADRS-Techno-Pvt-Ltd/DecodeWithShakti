import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { readPdfUpload } from "@/features/answer-sheets/validation";
import { saveQuestionBankPaperFile, deleteQuestionBankPaperFile } from "@/lib/storage";
import { syncQuestionBankPrimaryFile } from "@/lib/question-bank-files";

/** Add one or more new Test Series papers, without touching any existing ones. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const createdFiles: { id: string; filePath?: string }[] = [];
  try {
    await requireAdmin();
    const { id } = await params;
    const questionBank = await prisma.questionBank.findUnique({
      where: { id },
      select: { id: true, type: true },
    });
    if (!questionBank) return NextResponse.json({ error: "Question bank not found." }, { status: 404 });
    if (questionBank.type !== "TEST_SERIES") {
      return NextResponse.json(
        { error: "Only Test Series support separately downloadable papers." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) {
      return NextResponse.json({ error: "At least one PDF file is required." }, { status: 400 });
    }

    const created: { id: string; fileName: string; fileSizeBytes: number }[] = [];
    for (const file of files) {
      const bytes = await readPdfUpload(file);
      const record = await prisma.questionBankFile.create({
        data: { questionBankId: id, fileName: file.name, filePath: "", fileSizeBytes: file.size },
      });
      const entry: { id: string; filePath?: string } = { id: record.id };
      createdFiles.push(entry);
      const filePath = await saveQuestionBankPaperFile(id, record.id, bytes);
      entry.filePath = filePath;
      const updated = await prisma.questionBankFile.update({ where: { id: record.id }, data: { filePath } });
      created.push({ id: updated.id, fileName: updated.fileName, fileSizeBytes: updated.fileSizeBytes });
    }

    await syncQuestionBankPrimaryFile(id);

    return NextResponse.json({ ok: true, files: created });
  } catch (error) {
    for (const entry of createdFiles) {
      await prisma.questionBankFile.delete({ where: { id: entry.id } }).catch(() => undefined);
      if (entry.filePath) await deleteQuestionBankPaperFile(entry.filePath).catch(() => undefined);
    }
    if (error instanceof Error && (error.message.includes("PDF") || error.message.includes("file"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}
