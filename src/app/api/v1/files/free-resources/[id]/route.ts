import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

// No session check — free resources are meant to be publicly downloadable, no
// login required. Mirrors files/preview/[id]/route.ts's unauthenticated pattern.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resource = await prisma.freeResource.findUnique({ where: { id } });

  if (!resource || !resource.isPublished) {
    return NextResponse.json({ error: "Resource not available." }, { status: 404 });
  }

  const bytes = await readStoredFile(resource.filePath);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${resource.slug}.pdf"`,
    },
  });
}
