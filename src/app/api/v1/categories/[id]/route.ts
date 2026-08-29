import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only").optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = updateCategorySchema.parse(body);

    // If updating slug, check it's not taken
    if (data.slug) {
      const existing = await prisma.category.findUnique({
        where: { slug: data.slug },
      });

      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "A category with this slug already exists" }, { status: 400 });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    
    // Check for Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2025') {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      if (prismaError.code === 'P2002') {
        return NextResponse.json({ error: "A category with this value already exists" }, { status: 400 });
      }
    }
    
    console.error("Failed to update category:", error);
    return NextResponse.json({ 
      error: "Failed to update category",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check if category has question banks
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { questionBanks: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (category._count.questionBanks > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${category._count.questionBanks} question bank(s)` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
