import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { readStoredFile } from "@/lib/storage";
import { watermarkPdf } from "@/lib/watermark";

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
      select: {
        studentId: true,
        evaluatedFilePath: true,
        evaluatedFileName: true,
      },
    });
    if (
      !submission ||
      (session.user.role !== "ADMIN" && submission.studentId !== session.user.id) ||
      !submission.evaluatedFilePath ||
      !submission.evaluatedFileName
    ) {
      return NextResponse.json({ error: "Evaluated file not found." }, { status: 404 });
    }

    const bytes = await readStoredFile(submission.evaluatedFilePath);
    // Students get a watermarked copy (viewer's email, diagonal) like the question bank;
    // admins get the clean original. Watermarking happens in memory, never persisted.
    const body =
      session.user.role === "ADMIN"
        ? bytes
        : Buffer.from(await watermarkPdf(bytes, session.user.email ?? ""));
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName(submission.evaluatedFileName)}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}