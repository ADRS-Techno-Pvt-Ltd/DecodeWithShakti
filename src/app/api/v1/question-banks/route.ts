import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { questionBankInputSchema } from "@/lib/validation/question-bank";
import { uniqueSlug } from "@/lib/slug";
import {
  deleteAnswerKeyFiles,
  deleteQuestionBankFiles,
  saveAnswerKeyFile,
  saveOriginalFile,
  savePreviewFile,
  saveThumbnailFile,
  saveQuestionBankPaperFile,
} from "@/lib/storage";
import { getPageCount, buildPreview, mergePdfs } from "@/lib/preview";
import { extForThumbnailMime, thumbnailUrlFor, MAX_THUMBNAIL_BYTES } from "@/lib/thumbnail";
import { readPdfUpload } from "@/features/answer-sheets/validation";
import { syncQuestionBankPrimaryFile } from "@/lib/question-bank-files";

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const admin = searchParams.get("admin") === "true";
    const featured = searchParams.get("featured") === "true";
    const type = searchParams.get("type");
    const subject = searchParams.get("subject");

    if (admin) {
      await requireAdmin();
    }

    const banks = await prisma.questionBank.findMany({
      where: {
        ...(admin ? {} : { isPublished: true }),
        ...(category ? { category: { slug: category } } : {}),
        ...(featured ? { isFeatured: true } : {}),
        ...(type === "QUESTION_BANK" || type === "TEST_SERIES" || type === "MENTORSHIP" ? { type } : {}),
        ...(subject ? { subjectId: subject } : {}),
      },
      include: {
        category: true,
        subject: true,
        answerKeys: {
          select: { id: true, title: true, fileName: true },
          orderBy: { createdAt: "asc" },
        },
        files: {
          select: { id: true, fileName: true, fileSizeBytes: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: admin
        ? { createdAt: "desc" }
        : [{ isFeatured: "desc" }, { createdAt: "desc" }] as const,
    });

    return NextResponse.json(
      banks.map(({ thumbnailPath, ...bank }) => ({
        ...bank,
        thumbnailUrl: thumbnailUrlFor(thumbnailPath),
      })),
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    return await createQuestionBank(request);
  } catch (err) {
    return toErrorResponse(err);
  }
}

async function createQuestionBank(request: Request) {
  const session = await requireAdmin();
  let bankId: string | undefined;
  const answerKeyIds: string[] = [];

  try {
    const formData = await request.formData();
    const raw = Object.fromEntries(formData.entries());
    const parsed = questionBankInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const input = parsed.data;

    const files = formData
      .getAll("file")
      .filter((f): f is File => f instanceof File && f.size > 0);
    const answerKeyFiles = formData
      .getAll("answerKey")
      .filter((f): f is File => f instanceof File && f.size > 0);

    if (input.type === "MENTORSHIP" && (files.length > 0 || answerKeyFiles.length > 0)) {
      return NextResponse.json(
        { error: "Mentorship products cannot include a question bank PDF or answer key." },
        { status: 400 },
      );
    }
    if (input.type !== "MENTORSHIP" && answerKeyFiles.some((f) => f.type !== "application/pdf")) {
      return NextResponse.json({ error: "Answer keys must be PDF files." }, { status: 400 });
    }
    if (input.type !== "MENTORSHIP" && files.length === 0) {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }
    if (input.type !== "MENTORSHIP" && files.some((f) => f.type !== "application/pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }
    const totalUploadBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalUploadBytes > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Files exceed the ${process.env.MAX_UPLOAD_MB ?? 50}MB combined limit.` },
        { status: 400 },
      );
    }
    const file = files[0];

    const thumbnail = formData.get("thumbnail");
    let thumbnailExt: string | null = null;
    if (thumbnail instanceof File && thumbnail.size > 0) {
      thumbnailExt = extForThumbnailMime(thumbnail.type);
      if (!thumbnailExt) {
        return NextResponse.json(
          { error: "Thumbnail must be a JPEG, PNG, or WebP image." },
          { status: 400 },
        );
      }
      if (thumbnail.size > MAX_THUMBNAIL_BYTES) {
        return NextResponse.json({ error: "Thumbnail exceeds the 5MB limit." }, { status: 400 });
      }
    }

    // Test Series papers are kept as separate, independently downloadable
    // files. Question Bank uploads still merge into one document — it's sold
    // as a single product.
    const isTestSeries = input.type === "TEST_SERIES";
    const fileBuffers = input.type === "MENTORSHIP"
      ? []
      : await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer())));
    const bytes = input.type === "MENTORSHIP"
      ? null
      : isTestSeries
        ? fileBuffers[0]
        : await mergePdfs(fileBuffers);
    const totalPages = bytes ? await getPageCount(bytes) : null;

    if (input.previewPageCount != null && totalPages != null && input.previewPageCount > totalPages) {
      return NextResponse.json(
        { error: `previewPageCount cannot exceed the document's ${totalPages} pages.` },
        { status: 400 },
      );
    }

    const slug = uniqueSlug(input.title);

    const bank = await prisma.questionBank.create({
      data: {
      title: input.title,
      type: input.type,
      slug,
      description: input.description,
      categoryId: input.categoryId,
      subjectId: input.subjectId ?? null,
      price: input.price,
      earlyBirdPrice: input.earlyBirdPrice ?? null,
      earlyBirdEndsAt: input.earlyBirdEndsAt ?? null,
      fileName: file?.name ?? null,
      filePath: input.type === "MENTORSHIP" ? null : "", // set below once we know the id
      fileSizeBytes: bytes?.length ?? null,
      totalPages,
      previewEnabled: input.type === "MENTORSHIP" ? false : input.previewEnabled,
      previewPageCount: input.previewPageCount ?? null,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
      features: input.features,
      },
    });
    bankId = bank.id;

    if (isTestSeries) {
      for (const uploadedFile of files) {
        const fileBytes = Buffer.from(await uploadedFile.arrayBuffer());
        const record = await prisma.questionBankFile.create({
          data: { questionBankId: bank.id, fileName: uploadedFile.name, filePath: "", fileSizeBytes: uploadedFile.size },
        });
        const filePath = await saveQuestionBankPaperFile(bank.id, record.id, fileBytes);
        await prisma.questionBankFile.update({ where: { id: record.id }, data: { filePath } });
      }
    }

    let thumbnailPathValue: string | null = null;
    if (thumbnail instanceof File && thumbnailExt) {
      const thumbnailBytes = Buffer.from(await thumbnail.arrayBuffer());
      thumbnailPathValue = await saveThumbnailFile(bank.id, thumbnailBytes);
    }

    let updated: Prisma.QuestionBankGetPayload<{ include: { category: true; subject: true } }>;
    if (isTestSeries) {
      await syncQuestionBankPrimaryFile(bank.id);
      updated = await prisma.questionBank.update({
        where: { id: bank.id },
        data: { thumbnailPath: thumbnailPathValue },
        include: { category: true, subject: true },
      });
    } else {
      const filePath = bytes ? await saveOriginalFile(bank.id, bytes) : null;
      let previewFilePathValue: string | null = null;
      if (bytes && input.previewEnabled && input.previewPageCount) {
        const previewBytes = await buildPreview(bytes, input.previewPageCount);
        previewFilePathValue = await savePreviewFile(bank.id, previewBytes);
      }
      updated = await prisma.questionBank.update({
        where: { id: bank.id },
        data: { filePath, previewFilePath: previewFilePathValue, thumbnailPath: thumbnailPathValue },
        include: { category: true, subject: true },
      });
    }

    const createdAnswerKeys: { id: string; title: string; fileName: string }[] = [];
    for (const answerKeyFile of answerKeyFiles) {
      const answerKeyBytes = await readPdfUpload(answerKeyFile);
      const answerKey = await prisma.answerKey.create({
        data: {
          title: updated.title,
          description: updated.description,
          questionBankId: updated.id,
          categoryId: updated.categoryId,
          filePath: "",
          fileName: answerKeyFile.name,
          fileSizeBytes: answerKeyFile.size,
          createdById: session.user.id,
        },
      });
      answerKeyIds.push(answerKey.id);
      const answerKeyPath = await saveAnswerKeyFile(answerKey.id, answerKeyBytes);
      await prisma.answerKey.update({ where: { id: answerKey.id }, data: { filePath: answerKeyPath } });
      createdAnswerKeys.push({ id: answerKey.id, title: answerKey.title, fileName: answerKey.fileName });
    }

    const createdFiles = isTestSeries
      ? await prisma.questionBankFile.findMany({
          where: { questionBankId: bank.id },
          select: { id: true, fileName: true, fileSizeBytes: true },
          orderBy: { createdAt: "asc" },
        })
      : [];

    const { thumbnailPath, ...bankDto } = updated;
    return NextResponse.json(
      { ...bankDto, thumbnailUrl: thumbnailUrlFor(thumbnailPath), answerKeys: createdAnswerKeys, files: createdFiles },
      { status: 201 },
    );
  } catch (error) {
    for (const answerKeyId of answerKeyIds) {
      await prisma.answerKey.delete({ where: { id: answerKeyId } }).catch(() => undefined);
      await deleteAnswerKeyFiles(answerKeyId).catch(() => undefined);
    }
    if (bankId) {
      await prisma.questionBank.delete({ where: { id: bankId } }).catch(() => undefined);
      await deleteQuestionBankFiles(bankId).catch(() => undefined);
    }
    throw error;
  }
}
