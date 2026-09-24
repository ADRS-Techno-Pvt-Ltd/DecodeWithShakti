import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { freeResourceUpdateSchema } from "@/lib/validation/free-resource";
import { deleteFreeResourceFiles } from "@/lib/storage";
import { thumbnailUrlFor } from "@/lib/thumbnail";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.freeResource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Free resource not found." }, { status: 404 });
    }

    const raw = await request.json();
    const parsed = freeResourceUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const input = parsed.data;

    const updated = await prisma.freeResource.update({
      where: { id },
      data: {
        ...(input.title != null ? { title: input.title } : {}),
        ...(input.description != null ? { description: input.description } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId || null } : {}),
        ...(input.subjectId !== undefined ? { subjectId: input.subjectId || null } : {}),
        ...(input.isPublished != null ? { isPublished: input.isPublished } : {}),
      },
      include: { category: true, subject: true },
    });

    const { thumbnailPath, ...resourceDto } = updated;
    return NextResponse.json({ ...resourceDto, thumbnailUrl: thumbnailUrlFor(thumbnailPath) });
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

    const existing = await prisma.freeResource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Free resource not found." }, { status: 404 });
    }

    // Delete storage first — if this fails, the DB row (and the admin's ability
    // to retry) stays intact instead of leaving orphaned files with no owner.
    await deleteFreeResourceFiles(id);
    await prisma.freeResource.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
