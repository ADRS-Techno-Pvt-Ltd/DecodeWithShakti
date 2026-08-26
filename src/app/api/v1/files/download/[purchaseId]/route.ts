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

    const original = await readStoredFile(purchase.questionBank.filePath);
    const watermarked = await watermarkPdf(original, session.user.email ?? "");

    return new NextResponse(new Uint8Array(watermarked), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${purchase.questionBank.fileName}"`,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
