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
    const answerKey = await prisma.answerKey.findUnique({
      where: { id },
      select: {
        filePath: true,
        fileName: true,
        isPublished: true,
        questionBankId: true,
      },
    });
    if (!answerKey || (session.user.role !== "ADMIN" && !answerKey.isPublished)) {
      return NextResponse.json({ error: "Answer key not found." }, { status: 404 });
    }

    if (session.user.role !== "ADMIN") {
      if (!answerKey.questionBankId) {
        return NextResponse.json({ error: "Answer key not found." }, { status: 404 });
      }
      const [purchase, submission] = await Promise.all([
        prisma.purchase.findFirst({
          where: { userId: session.user.id, questionBankId: answerKey.questionBankId, status: "SUCCESS" },
          select: { id: true },
        }),
        prisma.answerSheetSubmission.findFirst({
          where: { studentId: session.user.id, questionBankId: answerKey.questionBankId },
          select: { id: true },
        }),
      ]);
      if (!purchase || !submission) {
        return NextResponse.json({ error: "Answer key not available." }, { status: 404 });
      }
    }

    const bytes = await readStoredFile(answerKey.filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName(answerKey.fileName)}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}