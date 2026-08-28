import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireStudent, toErrorResponse } from "@/lib/auth-guards";
import { deleteAccountSchema, updateEmailSchema } from "@/lib/validation/auth";

/**
 * Update user email (students only).
 */
export async function PATCH(request: Request) {
  try {
    const session = await requireStudent();
    const body = await request.json();
    
    // Defensive check for schema availability
    if (typeof updateEmailSchema === 'undefined') {
      console.error('updateEmailSchema is undefined - module import issue');
      return NextResponse.json({ 
        error: "Server configuration error. Please restart the development server." 
      }, { status: 500 });
    }
    
    const parsed = updateEmailSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    
    // Verify password
    const validPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
    }

    // Check if new email is already in use
    const existingUser = await prisma.user.findUnique({ 
      where: { email: parsed.data.newEmail } 
    });
    
    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json({ 
        error: "This email is already registered to another account" 
      }, { status: 409 });
    }

    // Update email
    await prisma.user.update({
      where: { id: user.id },
      data: { email: parsed.data.newEmail },
    });

    return NextResponse.json({ ok: true, email: parsed.data.newEmail });
  } catch (err) {
    return toErrorResponse(err);
  }
}

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
