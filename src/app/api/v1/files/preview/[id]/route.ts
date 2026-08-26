import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bank = await prisma.questionBank.findUnique({ where: { id } });

  if (!bank || !bank.previewEnabled || !bank.previewFilePath) {
    return NextResponse.json({ error: "Preview not available." }, { status: 404 });
  }

  const bytes = await readStoredFile(bank.previewFilePath);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${bank.slug}-preview.pdf"`,
    },
  });
}
