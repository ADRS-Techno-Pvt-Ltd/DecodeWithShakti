import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, blockImpersonation, toErrorResponse } from "@/lib/auth-guards";
import { deleteAnswerSheetFiles, saveStudentAnswerSheetFile } from "@/lib/storage";
import { sendAnswerSheetSubmittedEmails } from "@/lib/email";
import { answerSubmissionInputSchema, readPdfUpload } from "@/features/answer-sheets/validation";

type SubmissionWithFiles = {
  id: string;
  title: string;
  description: string;
  submittedAt: Date;
  questionBank: { id: string; title: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
  files: {
    id: string;
    studentFileName: string;
    evaluatedFileName: string | null;
    status: "PENDING_EVALUATION" | "EVALUATED";
    evaluatedAt: Date | null;
  }[];
};

function serializeSubmission(submission: SubmissionWithFiles) {
  return {
    id: submission.id,
    title: submission.title,
    description: submission.description,
    submittedAt: submission.submittedAt.toISOString(),
    // Derived: only fully evaluated once every uploaded paper has been.
    status: submission.files.length > 0 && submission.files.every((f) => f.status === "EVALUATED")
      ? ("EVALUATED" as const)
      : ("PENDING_EVALUATION" as const),
    evaluatedAt:
      submission.files
        .map((f) => f.evaluatedAt)
        .filter((d): d is Date => d != null)
        .sort((a, b) => b.getTime() - a.getTime())[0]
        ?.toISOString() ?? null,
    questionBank: submission.questionBank,
    category: submission.category,
    files: submission.files.map((f) => ({
      id: f.id,
      studentFileName: f.studentFileName,
      evaluatedFileName: f.evaluatedFileName,
      status: f.status,
    })),
  };
}

const submissionSelect = {
  id: true,
  title: true,
  description: true,
  submittedAt: true,
  questionBank: { select: { id: true, title: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  files: {
    select: { id: true, studentFileName: true, evaluatedFileName: true, status: true, evaluatedAt: true },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export async function GET() {
  try {
    const session = await requireStudent();
    const submissions = await prisma.answerSheetSubmission.findMany({
      where: { studentId: session.user.id },
      select: submissionSelect,
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json(submissions.map(serializeSubmission));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let submissionId: string | undefined;
  const fileIds: string[] = [];
  try {
    const session = await requireStudent();
    blockImpersonation(session);
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

    const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) {
      return NextResponse.json({ error: "At least one PDF file is required." }, { status: 400 });
    }
    const buffers = await Promise.all(files.map((file) => readPdfUpload(file)));

    const existing = await prisma.answerSheetSubmission.findUnique({
      where: { studentId_questionBankId: { studentId: session.user.id, questionBankId: questionBank.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have an answer sheet for this category." },
        { status: 409 },
      );
    }

    const submission = await prisma.answerSheetSubmission.create({
      data: {
        studentId: session.user.id,
        questionBankId: questionBank.id,
        categoryId: questionBank.categoryId,
        title: questionBank.title,
        description: questionBank.description,
      },
    });
    submissionId = submission.id;

    // Papers are kept separate — not merged — so each is evaluated on its own.
    for (let i = 0; i < files.length; i++) {
      const record = await prisma.answerSheetSubmissionFile.create({
        data: {
          submissionId: submission.id,
          studentFilePath: "",
          studentFileName: files[i].name,
          studentFileSizeBytes: files[i].size,
        },
      });
      fileIds.push(record.id);
      const studentFilePath = await saveStudentAnswerSheetFile(record.id, buffers[i]);
      await prisma.answerSheetSubmissionFile.update({ where: { id: record.id }, data: { studentFilePath } });
    }

    const updated = await prisma.answerSheetSubmission.findUniqueOrThrow({
      where: { id: submission.id },
      select: submissionSelect,
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
    for (const fileId of fileIds) {
      await deleteAnswerSheetFiles(fileId).catch(() => undefined);
    }
    if (submissionId) {
      await prisma.answerSheetSubmission.delete({ where: { id: submissionId } }).catch(() => undefined);
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
