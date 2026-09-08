import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import {
  deleteEvaluatedAnswerSheetFile,
  saveEvaluatedAnswerSheetFile,
} from "@/lib/storage";
import { sendAnswerSheetEvaluatedEmail } from "@/lib/email";
import { readPdfUpload } from "@/features/answer-sheets/validation";

type RouteContext = { params: Promise<{ id: string }> };

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
  student: { id: string; name: string; email: string };
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
    student: submission.student,
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const submission = await prisma.answerSheetSubmission.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        questionBank: { select: { id: true, title: true, slug: true } },
        student: { select: { id: true, name: true, email: true } },
      },
    });

    if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    if (session.user.role !== "ADMIN" && submission.studentId !== session.user.id) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    return NextResponse.json(serializeSubmission(submission));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  let submissionId: string | undefined;
  let evaluatedUploaded = false;
  try {
    const session = await requireSession();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    submissionId = id;
    const submission = await prisma.answerSheetSubmission.findUnique({
      where: { id },
      include: { category: true, questionBank: true, student: true },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    if (submission.status === "EVALUATED" || submission.evaluatedFilePath) {
      return NextResponse.json({ error: "This submission has already been evaluated." }, { status: 409 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const bytes = await readPdfUpload(file);
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }

    const evaluatedFilePath = await saveEvaluatedAnswerSheetFile(id, bytes);
    evaluatedUploaded = true;
    const updated = await prisma.answerSheetSubmission.update({
      where: { id, status: "PENDING_EVALUATION" },
      data: {
        evaluatedFilePath,
        evaluatedFileName: file.name,
        evaluatedFileSizeBytes: file.size,
        status: "EVALUATED",
        evaluatedById: session.user.id,
        evaluatedAt: new Date(),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        questionBank: { select: { id: true, title: true, slug: true } },
        student: { select: { id: true, name: true, email: true } },
      },
    });

    await sendAnswerSheetEvaluatedEmail({
      studentName: updated.student.name,
      studentEmail: updated.student.email,
      title: updated.title,
      category: updated.category.name,
    }).catch((error) => console.error("Evaluation notification failed:", error));

    return NextResponse.json(serializeSubmission(updated));
  } catch (error) {
    if (submissionId && evaluatedUploaded) {
      await deleteEvaluatedAnswerSheetFile(submissionId).catch(() => undefined);
    }
    if (error instanceof Error && (error.message.includes("PDF") || error.message.includes("file"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}