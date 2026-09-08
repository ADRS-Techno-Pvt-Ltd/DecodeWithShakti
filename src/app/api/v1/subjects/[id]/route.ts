import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";

const updateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only")
    .optional(),
  categoryId: z.string().min(1).nullish(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = updateSubjectSchema.parse(body);

    if (data.name) {
      const autoSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!data.slug || data.slug === autoSlug) {
        data.slug = autoSlug;
      }
    }

    if (data.slug) {
      const existing = await prisma.subject.findUnique({ where: { slug: data.slug } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "A subject with this slug already exists" }, { status: 400 });
      }
    }

    const subject = await prisma.subject.update({ where: { id }, data });
    return NextResponse.json(subject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === "P2025") {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
      if (prismaError.code === "P2002") {
        return NextResponse.json({ error: "A subject with this value already exists" }, { status: 400 });
      }
    }
    console.error("Failed to update subject:", error);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { _count: { select: { questionBanks: true } } },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    if (subject._count.questionBanks > 0) {
      return NextResponse.json(
        { error: `Cannot delete subject with ${subject._count.questionBanks} product(s)` },
        { status: 400 },
      );
    }

    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete subject:", error);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
