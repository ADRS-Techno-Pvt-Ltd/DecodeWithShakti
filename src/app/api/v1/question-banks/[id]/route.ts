import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { questionBankInputSchema } from "@/lib/validation/question-bank";
import { deleteQuestionBankFiles, readStoredFile, savePreviewFile } from "@/lib/storage";
import { buildPreview } from "@/lib/preview";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.questionBank.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Question bank not found." }, { status: 404 });
    }

    const raw = await request.json();
    const parsed = questionBankInputSchema.partial().safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const input = parsed.data;

    const previewEnabled = input.previewEnabled ?? existing.previewEnabled;
    const previewPageCount = input.previewPageCount ?? existing.previewPageCount ?? undefined;

    let previewFilePath = existing.previewFilePath;
    if (previewEnabled && previewPageCount) {
      const originalBytes = await readStoredFile(existing.filePath);
      const previewBytes = await buildPreview(originalBytes, previewPageCount);
      previewFilePath = await savePreviewFile(existing.id, previewBytes);
    } else if (!previewEnabled) {
      previewFilePath = null;
    }

    const updated = await prisma.questionBank.update({
      where: { id },
      data: {
        ...(input.title != null ? { title: input.title } : {}),
        ...(input.description != null ? { description: input.description } : {}),
        ...(input.categoryId != null ? { categoryId: input.categoryId } : {}),
        ...(input.price != null ? { price: input.price } : {}),
        earlyBirdPrice: input.earlyBirdPrice ?? null,
        earlyBirdEndsAt: input.earlyBirdEndsAt ?? null,
        previewEnabled,
        previewPageCount: previewEnabled ? (previewPageCount ?? null) : null,
        previewFilePath,
        ...(input.isPublished != null ? { isPublished: input.isPublished } : {}),
      },
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const purchaseCount = await prisma.purchase.count({ where: { questionBankId: id } });
    if (purchaseCount > 0) {
      return NextResponse.json(
        { error: "This question bank has purchases and cannot be deleted. Unpublish it instead." },
        { status: 409 },
      );
    }

    await prisma.questionBank.delete({ where: { id } });
    await deleteQuestionBankFiles(id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
