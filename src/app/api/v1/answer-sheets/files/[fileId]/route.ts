import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { deleteEvaluatedAnswerSheetFile, saveEvaluatedAnswerSheetFile } from "@/lib/storage";
import { sendAnswerSheetEvaluatedEmail } from "@/lib/email";
import { readPdfUpload, UploadValidationError } from "@/features/answer-sheets/validation";

/** Uploads the evaluated PDF for one of a student's separately-submitted papers. */
export async function PATCH(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  let fileId: string | undefined;
  let evaluatedUploaded = false;
  try {
    const session = await requireSession();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const params_ = await params;
    fileId = params_.fileId;
    const file = await prisma.answerSheetSubmissionFile.findUnique({
      where: { id: fileId },
      include: { submission: { include: { category: true, questionBank: true, student: true } } },
    });
    if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
    if (file.status === "EVALUATED" || file.evaluatedFilePath) {
      return NextResponse.json({ error: "This paper has already been evaluated." }, { status: 409 });
    }

    const formData = await request.formData();
    const uploaded = formData.get("file");
    const bytes = await readPdfUpload(uploaded);
    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }

    const evaluatedFilePath = await saveEvaluatedAnswerSheetFile(fileId, bytes);
    evaluatedUploaded = true;
    const claimed = await prisma.answerSheetSubmissionFile.updateMany({
      where: { id: fileId, status: "PENDING_EVALUATION" },
      data: {
        evaluatedFilePath,
        evaluatedFileName: uploaded.name,
        evaluatedFileSizeBytes: uploaded.size,
        status: "EVALUATED",
        evaluatedById: session.user.id,
        evaluatedAt: new Date(),
      },
    });
    if (claimed.count === 0) {
      // Another request evaluated this paper first — its record owns the stored file, so don't delete it.
      evaluatedUploaded = false;
      return NextResponse.json({ error: "This paper has already been evaluated." }, { status: 409 });
    }
    const updated = await prisma.answerSheetSubmissionFile.findUniqueOrThrow({ where: { id: fileId } });

    // Notify the student once every paper in the submission has been evaluated.
    const siblingFiles = await prisma.answerSheetSubmissionFile.findMany({
      where: { submissionId: file.submissionId },
      select: { status: true },
    });
    const paperCount = file.submission.questionBankId
      ? await prisma.questionBankFile.count({ where: { questionBankId: file.submission.questionBankId } })
      : 0;
    if (siblingFiles.length >= paperCount && siblingFiles.every((f) => f.status === "EVALUATED")) {
      await sendAnswerSheetEvaluatedEmail({
        studentName: file.submission.student.name,
        studentEmail: file.submission.student.email,
        title: file.submission.title,
        category: file.submission.category.name,
      }).catch((error) => console.error("Evaluation notification failed:", error));
    }

    return NextResponse.json({
      id: updated.id,
      studentFileName: updated.studentFileName,
      evaluatedFileName: updated.evaluatedFileName,
      status: updated.status,
    });
  } catch (error) {
    if (fileId && evaluatedUploaded) {
      await deleteEvaluatedAnswerSheetFile(fileId).catch(() => undefined);
    }
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}
