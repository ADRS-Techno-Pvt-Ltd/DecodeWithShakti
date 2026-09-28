import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";
import { watermarkPdf } from "@/lib/watermark";

// No session check, same as the parent free-resource file route — publicly downloadable.
// Still watermarked with the brand for the same reason as the parent route.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resource = await prisma.freeResource.findUnique({ where: { id } });

  if (!resource || !resource.isPublished || !resource.answerKeyFilePath) {
    return NextResponse.json({ error: "Answer key not available." }, { status: 404 });
  }

  const original = await readStoredFile(resource.answerKeyFilePath);
  const bytes = await watermarkPdf(original, "www.decodewithshakti.com");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resource.slug}-answer-key.pdf"`,
    },
  });
}
