import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession, toErrorResponse } from "@/lib/auth-guards";
import { deleteAnswerKeyFiles, saveAnswerKeyFile } from "@/lib/storage";
import { answerKeyInputSchema, readPdfUpload } from "@/features/answer-sheets/validation";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const isAdmin = session.user.role === "ADMIN";
    const categoryId = new URL(request.url).searchParams.get("categoryId");
    const keys = await prisma.answerKey.findMany({
      where: {
        ...(isAdmin
          ? {}
          : {
              isPublished: true,
              questionBankId: { not: null },
              questionBank: {
                is: {
                  purchases: { some: { userId: session.user.id, status: "SUCCESS" } },
                  answerSubmissions: { some: { studentId: session.user.id } },
                },
              },
            }),
        ...(categoryId ? { categoryId } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        isPublished: true,
        fileName: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
        questionBank: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      keys.map((key) => ({ ...key, createdAt: key.createdAt.toISOString() })),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let answerKeyId: string | undefined;
  try {
    const session = await requireAdmin();
    const formData = await request.formData();
    const parsed = answerKeyInputSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      questionBankId: formData.get("questionBankId"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const questionBank = await prisma.questionBank.findUnique({
      where: { id: parsed.data.questionBankId },
      select: { id: true, title: true, description: true, categoryId: true, isPublished: true },
    });
    if (!questionBank) {
      return NextResponse.json({ error: "Select a valid Test Series." }, { status: 400 });
    }
    const file = formData.get("file");
    const bytes = await readPdfUpload(file);
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }

    const answerKey = await prisma.answerKey.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        questionBankId: questionBank.id,
        categoryId: questionBank.categoryId,
        filePath: "",
        fileName: file.name,
        fileSizeBytes: file.size,
        createdById: session.user.id,
      },
    });
    answerKeyId = answerKey.id;
    const filePath = await saveAnswerKeyFile(answerKey.id, bytes);
    const updated = await prisma.answerKey.update({
      where: { id: answerKey.id },
      data: { filePath },
      select: {
        id: true,
        title: true,
        description: true,
        isPublished: true,
        fileName: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    if (answerKeyId) {
      await prisma.answerKey.delete({ where: { id: answerKeyId } }).catch(() => undefined);
      await deleteAnswerKeyFiles(answerKeyId).catch(() => undefined);
    }
    if (error instanceof Error && (error.message.includes("PDF") || error.message.includes("file"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}