import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { freeResourceInputSchema } from "@/lib/validation/free-resource";
import { uniqueSlug } from "@/lib/slug";
import {
  deleteFreeResourceFiles,
  saveFreeResourceAnswerKeyFile,
  saveFreeResourceFile,
  saveFreeResourceThumbnailFile,
} from "@/lib/storage";
import { extForThumbnailMime, thumbnailUrlFor, MAX_THUMBNAIL_BYTES } from "@/lib/thumbnail";

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin") === "true";
    const category = searchParams.get("category");
    const subject = searchParams.get("subject");

    if (admin) {
      await requireAdmin();
    }

    const resources = await prisma.freeResource.findMany({
      where: {
        ...(admin ? {} : { isPublished: true }),
        ...(category ? { category: { slug: category } } : {}),
        ...(subject ? { subjectId: subject } : {}),
      },
      include: { category: true, subject: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      resources.map(({ thumbnailPath, ...resource }) => ({
        ...resource,
        thumbnailUrl: thumbnailUrlFor(thumbnailPath),
      })),
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    return await createFreeResource(request);
  } catch (err) {
    return toErrorResponse(err);
  }
}

async function createFreeResource(request: Request) {
  await requireAdmin();
  let resourceId: string | undefined;

  try {
    const formData = await request.formData();
    const raw = Object.fromEntries(formData.entries());
    const parsed = freeResourceInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const input = parsed.data;

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
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

    const answerKey = formData.get("answerKey");
    if (answerKey instanceof File && answerKey.size > 0) {
      if (answerKey.type !== "application/pdf") {
        return NextResponse.json({ error: "Answer key must be a PDF file." }, { status: 400 });
      }
      if (answerKey.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `Answer key exceeds the ${process.env.MAX_UPLOAD_MB ?? 50}MB limit.` },
          { status: 400 },
        );
      }
    }

    const slug = uniqueSlug(input.title);
    const bytes = Buffer.from(await file.arrayBuffer());

    const resource = await prisma.freeResource.create({
      data: {
        title: input.title,
        slug,
        description: input.description,
        categoryId: input.categoryId ?? null,
        subjectId: input.subjectId ?? null,
        fileName: file.name,
        filePath: "", // set below once we know the id
        fileSizeBytes: file.size,
        isPublished: input.isPublished,
      },
    });
    resourceId = resource.id;

    const filePath = await saveFreeResourceFile(resource.id, bytes);
    let thumbnailPathValue: string | null = null;
    if (thumbnail instanceof File && thumbnailExt) {
      const thumbnailBytes = Buffer.from(await thumbnail.arrayBuffer());
      thumbnailPathValue = await saveFreeResourceThumbnailFile(resource.id, thumbnailBytes);
    }
    let answerKeyPathValue: string | null = null;
    if (answerKey instanceof File && answerKey.size > 0) {
      const answerKeyBytes = Buffer.from(await answerKey.arrayBuffer());
      answerKeyPathValue = await saveFreeResourceAnswerKeyFile(resource.id, answerKeyBytes);
    }

    const updated = await prisma.freeResource.update({
      where: { id: resource.id },
      data: {
        filePath,
        thumbnailPath: thumbnailPathValue,
        answerKeyFilePath: answerKeyPathValue,
        answerKeyFileName: answerKey instanceof File && answerKey.size > 0 ? answerKey.name : null,
        answerKeyFileSizeBytes: answerKey instanceof File && answerKey.size > 0 ? answerKey.size : null,
      },
      include: { category: true, subject: true },
    });

    const { thumbnailPath, ...resourceDto } = updated;
    return NextResponse.json(
      { ...resourceDto, thumbnailUrl: thumbnailUrlFor(thumbnailPath) },
      { status: 201 },
    );
  } catch (error) {
    if (resourceId) {
      await prisma.freeResource.delete({ where: { id: resourceId } }).catch(() => undefined);
      await deleteFreeResourceFiles(resourceId).catch(() => undefined);
    }
    throw error;
  }
}
