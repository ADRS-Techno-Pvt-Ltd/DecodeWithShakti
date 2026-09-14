import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { readStoredFile } from "@/lib/storage";

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

/** `id` is an `AnswerSheetSubmissionFile` id — one of the student's separately uploaded papers. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const file = await prisma.answerSheetSubmissionFile.findUnique({
      where: { id },
      select: {
        studentFilePath: true,
        studentFileName: true,
        submission: { select: { studentId: true } },
      },
    });
    if (!file || (session.user.role !== "ADMIN" && file.submission.studentId !== session.user.id)) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const bytes = await readStoredFile(file.studentFilePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName(file.studentFileName)}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
