import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { deleteAccountSchema } from "@/lib/validation/auth";

/**
 * Self-service account deletion (students only — the single admin account is
 * seeded, not self-managed). Purchase/PasswordResetToken.userId are
 * ON DELETE RESTRICT, so a user with purchase history can't be hard-deleted
 * without breaking sales/invoice records — anonymize instead, keeping the
 * Purchase/Invoice rows intact for admin sales history and tax records.
 */
export async function DELETE(request: Request) {
  try {
    const session = await requireStudent();
    const body = await request.json();
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    const validPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
    }

    const purchaseCount = await prisma.purchase.count({ where: { userId: user.id } });

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });

      if (purchaseCount === 0) {
        await tx.user.delete({ where: { id: user.id } });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: {
            name: "Deleted User",
            email: `deleted-${user.id}@removed.local`,
            passwordHash: await bcrypt.hash(randomUUID(), 10),
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
