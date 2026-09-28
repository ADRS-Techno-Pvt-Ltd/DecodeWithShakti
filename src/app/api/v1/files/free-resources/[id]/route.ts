import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";
import { watermarkPdf } from "@/lib/watermark";

// No session check — free resources are meant to be publicly downloadable, no
// login required. Mirrors files/preview/[id]/route.ts's unauthenticated pattern.
// Still watermarked (with the brand, since there's no logged-in user to label it
// with) so a downloaded free PDF can't be re-uploaded elsewhere with no trace.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resource = await prisma.freeResource.findUnique({ where: { id } });

  if (!resource || !resource.isPublished) {
    return NextResponse.json({ error: "Resource not available." }, { status: 404 });
  }

  const original = await readStoredFile(resource.filePath);
  const bytes = await watermarkPdf(original, "www.decodewithshakti.com");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resource.slug}.pdf"`,
    },
  });
}
