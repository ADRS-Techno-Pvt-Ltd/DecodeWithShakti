import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { categoryInputSchema } from "@/lib/validation/category";
import { uniqueSlug } from "@/lib/slug";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories);
}

/** Admin-only. Lets the question-bank form's category picker create a category inline. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const raw = await request.json();
    const parsed = categoryInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const name = parsed.data.name.trim();

    // Two admins typing the same category name should land on the same row,
    // not create a duplicate — reuse an existing case-insensitive match.
    const existing = await prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(existing);
    }

    const category = await prisma.category.create({
      data: { name, slug: uniqueSlug(name) },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
