import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (
    !resetToken ||
    resetToken.usedAt != null ||
    resetToken.expiresAt < new Date()
  ) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null, id: { not: resetToken.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
