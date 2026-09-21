import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, blockImpersonation, toErrorResponse } from "@/lib/auth-guards";
import { deleteAnswerSheetFiles, saveStudentAnswerSheetFile } from "@/lib/storage";
import { readPdfUpload, UploadValidationError } from "@/features/answer-sheets/validation";

/**
 * Adds more papers to an existing submission — allowed only while the student
 * hasn't yet submitted one for every paper in the Test Series. Once they have,
 * the submission is locked (no add/replace), matching how a real answer sheet
 * works once fully handed in.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const createdFileIds: string[] = [];
  try {
    const session = await requireStudent();
    blockImpersonation(session);
    const { id } = await params;

    const submission = await prisma.answerSheetSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        questionBankId: true,
        files: { select: { id: true } },
      },
    });
    if (!submission || submission.studentId !== session.user.id) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const paperCount = submission.questionBankId
      ? await prisma.questionBankFile.count({ where: { questionBankId: submission.questionBankId } })
      : submission.files.length;
    const remainingSlots = Math.max(0, paperCount - submission.files.length);
    if (remainingSlots === 0) {
      return NextResponse.json(
        { error: "You've already submitted an answer sheet for every paper in this Test Series." },
        { status: 409 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) {
      return NextResponse.json({ error: "At least one PDF file is required." }, { status: 400 });
    }
    if (files.length > remainingSlots) {
      return NextResponse.json(
        {
          error: `Only ${remainingSlots} more paper${remainingSlots === 1 ? "" : "s"} can be added — this Test Series has ${paperCount} paper${paperCount === 1 ? "" : "s"} in total.`,
        },
        { status: 400 },
      );
    }
    const buffers = await Promise.all(files.map((file) => readPdfUpload(file)));

    const created: { id: string; studentFileName: string; evaluatedFileName: string | null; status: "PENDING_EVALUATION" }[] = [];
    for (let i = 0; i < files.length; i++) {
      const record = await prisma.answerSheetSubmissionFile.create({
        data: {
          submissionId: submission.id,
          studentFilePath: "",
          studentFileName: files[i].name,
          studentFileSizeBytes: files[i].size,
        },
      });
      createdFileIds.push(record.id);
      const studentFilePath = await saveStudentAnswerSheetFile(record.id, buffers[i]);
      await prisma.answerSheetSubmissionFile.update({ where: { id: record.id }, data: { studentFilePath } });
      created.push({
        id: record.id,
        studentFileName: record.studentFileName,
        evaluatedFileName: null,
        status: "PENDING_EVALUATION",
      });
    }

    return NextResponse.json({ files: created });
  } catch (error) {
    for (const fileId of createdFileIds) {
      await deleteAnswerSheetFiles(fileId).catch(() => undefined);
    }
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}
