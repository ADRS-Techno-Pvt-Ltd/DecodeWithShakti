import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { readStoredFile } from "@/lib/storage";
import { watermarkPdf } from "@/lib/watermark";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ purchaseId: string }> },
) {
  try {
    const session = await requireSession();
    const { purchaseId } = await params;

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { questionBank: true },
    });

    if (!purchase || purchase.userId !== session.user.id || purchase.status !== "SUCCESS") {
      return NextResponse.json({ error: "Not found or not purchased." }, { status: 403 });
    }
    // Pin to the exact file the buyer paid for. fileSnapshotPath is only null for
    // purchases made before this snapshot existed — those fall back to whatever
    // QuestionBank.filePath currently is, same as pre-snapshot behavior.
    const filePath = purchase.fileSnapshotPath ?? purchase.questionBank.filePath;
    const fileName = purchase.fileSnapshotName ?? purchase.questionBank.fileName;
    if (!filePath || !fileName) {
      return NextResponse.json({ error: "This product has no downloadable file." }, { status: 404 });
    }

    const original = await readStoredFile(filePath);
    const watermarked = await watermarkPdf(original, session.user.email ?? "");

    return new NextResponse(new Uint8Array(watermarked), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
