import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { readStoredFile } from "@/lib/storage";
import { watermarkPdf } from "@/lib/watermark";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const file = await prisma.questionBankFile.findUnique({
      where: { id },
      select: { filePath: true, fileName: true, questionBankId: true },
    });
    if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });

    if (session.user.role !== "ADMIN") {
      const purchase = await prisma.purchase.findFirst({
        where: { userId: session.user.id, questionBankId: file.questionBankId, status: "SUCCESS" },
        select: { id: true },
      });
      if (!purchase) return NextResponse.json({ error: "Not found or not purchased." }, { status: 403 });
    }

    const original = await readStoredFile(file.filePath);
    const watermarked = await watermarkPdf(original, session.user.email ?? "");

    return new NextResponse(new Uint8Array(watermarked), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
