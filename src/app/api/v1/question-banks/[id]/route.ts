import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { questionBankUpdateSchema } from "@/lib/validation/question-bank";
import { deleteAnswerKeyFiles, deleteQuestionBankFiles, readStoredFile, savePreviewFile } from "@/lib/storage";
import { buildPreview } from "@/lib/preview";
import { thumbnailUrlFor } from "@/lib/thumbnail";

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
    const parsed = questionBankUpdateSchema.safeParse(raw);
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
        ...(input.type != null ? { type: input.type } : {}),
        ...(input.description != null ? { description: input.description } : {}),
        ...(input.categoryId != null ? { categoryId: input.categoryId } : {}),
        ...(input.price != null ? { price: input.price } : {}),
        earlyBirdPrice: input.earlyBirdPrice ?? null,
        earlyBirdEndsAt: input.earlyBirdEndsAt ?? null,
        previewEnabled,
        previewPageCount: previewEnabled ? (previewPageCount ?? null) : null,
        previewFilePath,
        ...(input.isPublished != null ? { isPublished: input.isPublished } : {}),
        ...(input.isFeatured != null ? { isFeatured: input.isFeatured } : {}),
        ...(input.features != null ? { features: input.features } : {}),
      },
      include: { category: true },
    });

    await prisma.answerKey.updateMany({
      where: { questionBankId: id },
      data: {
        title: updated.title,
        description: updated.description,
        categoryId: updated.categoryId,
      },
    });

    const { thumbnailPath, ...bankDto } = updated;
    return NextResponse.json({
      ...bankDto,
      thumbnailUrl: thumbnailUrlFor(thumbnailPath),
    });
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

    const [purchaseCount, submissionCount] = await Promise.all([
      prisma.purchase.count({ where: { questionBankId: id } }),
      prisma.answerSheetSubmission.count({ where: { questionBankId: id } }),
    ]);
    if (purchaseCount > 0 || submissionCount > 0) {
      return NextResponse.json(
        { error: "This Test Series has purchases or submissions and cannot be deleted. Unpublish it instead." },
        { status: 409 },
      );
    }

    const answerKeys = await prisma.answerKey.findMany({ where: { questionBankId: id }, select: { id: true } });

    // Delete storage first — if this fails, the DB row (and the admin's ability
    // to retry) stays intact instead of leaving orphaned files with no owner.
    await deleteQuestionBankFiles(id);
    await Promise.all(answerKeys.map((key) => deleteAnswerKeyFiles(key.id)));
    await prisma.answerKey.deleteMany({ where: { questionBankId: id } });
    await prisma.questionBank.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
