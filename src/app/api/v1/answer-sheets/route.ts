import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { deleteAnswerSheetFiles, saveStudentAnswerSheetFile } from "@/lib/storage";
import { sendAnswerSheetSubmittedEmails } from "@/lib/email";
import { answerSubmissionInputSchema, readPdfUpload } from "@/features/answer-sheets/validation";

function serializeSubmission(submission: {
  id: string;
  title: string;
  description: string;
  status: "PENDING_EVALUATION" | "EVALUATED";
  submittedAt: Date;
  evaluatedAt: Date | null;
  studentFileName: string;
  evaluatedFileName: string | null;
  questionBank: { id: string; title: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
}) {
  return {
    id: submission.id,
    title: submission.title,
    description: submission.description,
    status: submission.status,
    submittedAt: submission.submittedAt.toISOString(),
    evaluatedAt: submission.evaluatedAt?.toISOString() ?? null,
    studentFileName: submission.studentFileName,
    evaluatedFileName: submission.evaluatedFileName,
    questionBank: submission.questionBank,
    category: submission.category,
  };
}

export async function GET() {
  try {
    const session = await requireStudent();
    const submissions = await prisma.answerSheetSubmission.findMany({
      where: { studentId: session.user.id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        submittedAt: true,
        evaluatedAt: true,
        studentFileName: true,
        evaluatedFileName: true,
        questionBank: { select: { id: true, title: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json(submissions.map(serializeSubmission));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let submissionId: string | undefined;
  try {
    const session = await requireStudent();
    const formData = await request.formData();
    const parsed = answerSubmissionInputSchema.safeParse({ questionBankId: formData.get("questionBankId") });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const questionBank = await prisma.questionBank.findUnique({
      where: { id: parsed.data.questionBankId },
      include: { category: true },
    });
    if (!questionBank || !questionBank.isPublished) {
      return NextResponse.json({ error: "Test Series not found." }, { status: 404 });
    }

    const purchase = await prisma.purchase.findFirst({
      where: { userId: session.user.id, questionBankId: questionBank.id, status: "SUCCESS" },
      select: { id: true },
    });
    if (!purchase) {
      return NextResponse.json({ error: "Purchase this Test Series before uploading an answer." }, { status: 403 });
    }

    const bytes = await readPdfUpload(formData.get("file"));

    const existing = await prisma.answerSheetSubmission.findUnique({
      where: { studentId_questionBankId: { studentId: session.user.id, questionBankId: questionBank.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have an answer sheet for this category." },
        { status: 409 },
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }

    const submission = await prisma.answerSheetSubmission.create({
      data: {
        studentId: session.user.id,
        questionBankId: questionBank.id,
        categoryId: questionBank.categoryId,
        title: questionBank.title,
        description: questionBank.description,
        studentFilePath: "",
        studentFileName: file.name,
        studentFileSizeBytes: file.size,
      },
    });
    submissionId = submission.id;

    const studentFilePath = await saveStudentAnswerSheetFile(submission.id, bytes);
    const updated = await prisma.answerSheetSubmission.update({
      where: { id: submission.id },
      data: { studentFilePath },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        submittedAt: true,
        evaluatedAt: true,
        studentFileName: true,
        evaluatedFileName: true,
        questionBank: { select: { id: true, title: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    const student = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    if (student) {
      await sendAnswerSheetSubmittedEmails({
        studentName: student.name,
        studentEmail: student.email,
        title: updated.title,
        category: updated.category.name,
      }).catch((error) => console.error("Answer-sheet notification failed:", error));
    }

    return NextResponse.json(serializeSubmission(updated), { status: 201 });
  } catch (error) {
    if (submissionId) {
      await prisma.answerSheetSubmission.delete({ where: { id: submissionId } }).catch(() => undefined);
      await deleteAnswerSheetFiles(submissionId).catch(() => undefined);
    }
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: "You already have an answer sheet for this category." },
        { status: 409 },
      );
    }
    if (error instanceof Error && (error.message.includes("PDF") || error.message.includes("file"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}