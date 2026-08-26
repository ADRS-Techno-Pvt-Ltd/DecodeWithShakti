import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const session = await requireSession();
    const { invoiceId } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { purchase: true },
    });

    if (!invoice || invoice.purchase.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found." }, { status: 403 });
    }

    const bytes = await readStoredFile(invoice.filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
