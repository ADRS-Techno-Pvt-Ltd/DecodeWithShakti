import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, toErrorResponse } from "@/lib/auth-guards";
import { readStoredFile } from "@/lib/storage";
import { ensureInvoice } from "@/lib/payment/finalize-purchase";

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

    const isOwner = invoice?.purchase.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!invoice || (!isOwner && !isAdmin)) {
      return NextResponse.json({ error: "Not found." }, { status: 403 });
    }

    let bytes: Buffer;
    try {
      bytes = await readStoredFile(invoice.filePath);
    } catch (err) {
      // The Invoice row can outlive its Cloudinary object (manual deletion,
      // storage-provider hiccup). Self-heal by regenerating the same
      // invoice number/PDF and overwriting it, then serve the fresh copy.
      if (!(err instanceof Error) || !err.message.includes("(404)")) throw err;
      await ensureInvoice(invoice.purchase.id, { force: true });
      const repaired = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      bytes = await readStoredFile(repaired.filePath);
    }

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
