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
    const answerKey = await prisma.answerKey.findUnique({
      where: { id },
      select: {
        filePath: true,
        fileName: true,
        isPublished: true,
        questionBankId: true,
        questionBank: { select: { type: true } },
      },
    });
    if (!answerKey || (session.user.role !== "ADMIN" && !answerKey.isPublished)) {
      return NextResponse.json({ error: "Answer key not found." }, { status: 404 });
    }

    if (session.user.role !== "ADMIN") {
      if (!answerKey.questionBankId) {
        return NextResponse.json({ error: "Answer key not found." }, { status: 404 });
      }
      // Test Series keys require a submitted answer sheet first; question-bank keys unlock on purchase alone.
      const requiresSubmission = answerKey.questionBank?.type !== "QUESTION_BANK";
      const [purchase, submission] = await Promise.all([
        prisma.purchase.findFirst({
          where: { userId: session.user.id, questionBankId: answerKey.questionBankId, status: "SUCCESS" },
          select: { id: true },
        }),
        requiresSubmission
          ? prisma.answerSheetSubmission.findFirst({
              where: { studentId: session.user.id, questionBankId: answerKey.questionBankId },
              select: { id: true },
            })
          : Promise.resolve(true),
      ]);
      if (!purchase || !submission) {
        return NextResponse.json({ error: "Answer key not available." }, { status: 404 });
      }
    }

    const bytes = await readStoredFile(answerKey.filePath);
    // Students get a watermarked copy (viewer's email, diagonal) like the question bank;
    // admins get the clean original. Watermarking happens in memory, never persisted.
    const body =
      session.user.role === "ADMIN"
        ? bytes
        : Buffer.from(await watermarkPdf(bytes, session.user.email ?? ""));
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName(answerKey.fileName)}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}