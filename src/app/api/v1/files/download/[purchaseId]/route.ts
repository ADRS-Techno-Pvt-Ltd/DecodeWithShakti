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
    // Always serve the current QuestionBank file, not the snapshot taken at purchase
    // time — an admin replacing the PDF (correction, new edition) should update what
    // every buyer downloads, old and new purchases alike.
    const filePath = purchase.questionBank.filePath;
    const fileName = purchase.questionBank.fileName;
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
