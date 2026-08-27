import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { questionBankInputSchema } from "@/lib/validation/question-bank";
import { uniqueSlug } from "@/lib/slug";
import { saveOriginalFile, savePreviewFile, saveThumbnailFile } from "@/lib/storage";
import { getPageCount, buildPreview } from "@/lib/preview";
import { extForThumbnailMime, thumbnailUrlFor, MAX_THUMBNAIL_BYTES } from "@/lib/thumbnail";

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const admin = searchParams.get("admin") === "true";
    const featured = searchParams.get("featured") === "true";

    if (admin) {
      await requireAdmin();
    }

    const banks = await prisma.questionBank.findMany({
      where: {
        ...(admin ? {} : { isPublished: true }),
        ...(category ? { category: { slug: category } } : {}),
        ...(featured ? { isFeatured: true } : {}),
      },
      include: { category: true },
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
  await requireAdmin();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the ${process.env.MAX_UPLOAD_MB ?? 50}MB limit.` },
      { status: 400 },
    );
  }

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

  const raw = Object.fromEntries(formData.entries());
  const parsed = questionBankInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const bytes = Buffer.from(await file.arrayBuffer());
  const totalPages = await getPageCount(bytes);

  if (input.previewPageCount != null && input.previewPageCount > totalPages) {
    return NextResponse.json(
      { error: `previewPageCount cannot exceed the document's ${totalPages} pages.` },
      { status: 400 },
    );
  }

  const slug = uniqueSlug(input.title);

  const bank = await prisma.questionBank.create({
    data: {
      title: input.title,
      slug,
      description: input.description,
      categoryId: input.categoryId,
      price: input.price,
      earlyBirdPrice: input.earlyBirdPrice ?? null,
      earlyBirdEndsAt: input.earlyBirdEndsAt ?? null,
      fileName: file.name,
      filePath: "", // set below once we know the id
      fileSizeBytes: file.size,
      totalPages,
      previewEnabled: input.previewEnabled,
      previewPageCount: input.previewPageCount ?? null,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
      features: input.features,
    },
  });

  const filePath = await saveOriginalFile(bank.id, bytes);
  let previewFilePathValue: string | null = null;

  if (input.previewEnabled && input.previewPageCount) {
    const previewBytes = await buildPreview(bytes, input.previewPageCount);
    previewFilePathValue = await savePreviewFile(bank.id, previewBytes);
  }

  let thumbnailPathValue: string | null = null;
  if (thumbnail instanceof File && thumbnailExt) {
    const thumbnailBytes = Buffer.from(await thumbnail.arrayBuffer());
    thumbnailPathValue = await saveThumbnailFile(bank.id, thumbnailBytes);
  }

  const updated = await prisma.questionBank.update({
    where: { id: bank.id },
    data: { filePath, previewFilePath: previewFilePathValue, thumbnailPath: thumbnailPathValue },
    include: { category: true },
  });

  const { thumbnailPath, ...bankDto } = updated;
  return NextResponse.json(
    { ...bankDto, thumbnailUrl: thumbnailUrlFor(thumbnailPath) },
    { status: 201 },
  );
}
