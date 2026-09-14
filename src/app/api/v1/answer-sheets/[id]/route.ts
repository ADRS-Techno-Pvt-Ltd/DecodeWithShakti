import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";

type RouteContext = { params: Promise<{ id: string }> };

const submissionSelect = {
  id: true,
  title: true,
  description: true,
  submittedAt: true,
  questionBank: { select: { id: true, title: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  student: { select: { id: true, name: true, email: true } },
  files: {
    select: { id: true, studentFileName: true, evaluatedFileName: true, status: true, evaluatedAt: true },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

function serializeSubmission(submission: Awaited<ReturnType<typeof loadSubmission>>) {
  if (!submission) return null;
  return {
    id: submission.id,
    title: submission.title,
    description: submission.description,
    submittedAt: submission.submittedAt.toISOString(),
    status: submission.files.length > 0 && submission.files.every((f) => f.status === "EVALUATED")
      ? ("EVALUATED" as const)
      : ("PENDING_EVALUATION" as const),
    questionBank: submission.questionBank,
    category: submission.category,
    student: submission.student,
    files: submission.files.map((f) => ({
      id: f.id,
      studentFileName: f.studentFileName,
      evaluatedFileName: f.evaluatedFileName,
      status: f.status,
      evaluatedAt: f.evaluatedAt?.toISOString() ?? null,
    })),
  };
}

function loadSubmission(id: string) {
  return prisma.answerSheetSubmission.findUnique({ where: { id }, select: submissionSelect });
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const submission = await loadSubmission(id);

    if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    if (session.user.role !== "ADMIN" && submission.student.id !== session.user.id) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    return NextResponse.json(serializeSubmission(submission));
  } catch (error) {
    return toErrorResponse(error);
  }
}
