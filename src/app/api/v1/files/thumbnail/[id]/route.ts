import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bank = await prisma.questionBank.findUnique({ where: { id } });

  if (!bank || !bank.thumbnailPath) {
    return NextResponse.json({ error: "Thumbnail not available." }, { status: 404 });
  }

  const ext = bank.thumbnailPath.split(".").pop() ?? "";
  const bytes = await readStoredFile(bank.thumbnailPath);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
