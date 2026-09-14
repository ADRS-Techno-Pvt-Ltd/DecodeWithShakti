import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { readStoredFile } from "@/lib/storage";
import { watermarkPdf } from "@/lib/watermark";

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

/** `id` is an `AnswerSheetSubmissionFile` id — its own evaluated counterpart, if marked. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const file = await prisma.answerSheetSubmissionFile.findUnique({
      where: { id },
      select: {
        evaluatedFilePath: true,
        evaluatedFileName: true,
        submission: { select: { studentId: true } },
      },
    });
    if (
      !file ||
      (session.user.role !== "ADMIN" && file.submission.studentId !== session.user.id) ||
      !file.evaluatedFilePath ||
      !file.evaluatedFileName
    ) {
      return NextResponse.json({ error: "Evaluated file not found." }, { status: 404 });
    }

    const bytes = await readStoredFile(file.evaluatedFilePath);
    // Students get a watermarked copy (viewer's email, diagonal) like the question bank;
    // admins get the clean original. Watermarking happens in memory, never persisted.
    const body =
      session.user.role === "ADMIN"
        ? bytes
        : Buffer.from(await watermarkPdf(bytes, session.user.email ?? ""));
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName(file.evaluatedFileName)}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
