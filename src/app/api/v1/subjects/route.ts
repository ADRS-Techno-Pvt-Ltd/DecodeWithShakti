import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";

const createSubjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  categoryId: z.string().min(1).nullish(),
});

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { questionBanks: true } },
      },
    });
    return NextResponse.json(subjects);
  } catch (error) {
    console.error("Failed to fetch subjects:", error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = createSubjectSchema.parse(body);

    const existing = await prisma.subject.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json({ error: "A subject with this slug already exists" }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: { name: data.name, slug: data.slug, categoryId: data.categoryId ?? null },
    });
    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Failed to create subject:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
