import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

// No session check, same as the parent free-resource file route — publicly downloadable.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resource = await prisma.freeResource.findUnique({ where: { id } });

  if (!resource || !resource.isPublished || !resource.answerKeyFilePath) {
    return NextResponse.json({ error: "Answer key not available." }, { status: 404 });
  }

  const bytes = await readStoredFile(resource.answerKeyFilePath);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resource.slug}-answer-key.pdf"`,
    },
  });
}
