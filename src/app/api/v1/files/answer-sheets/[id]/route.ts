import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { readStoredFile } from "@/lib/storage";

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const submission = await prisma.answerSheetSubmission.findUnique({
      where: { id },
      select: { studentId: true, studentFilePath: true, studentFileName: true },
    });
    if (!submission || (session.user.role !== "ADMIN" && submission.studentId !== session.user.id)) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const bytes = await readStoredFile(submission.studentFilePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName(submission.studentFileName)}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}