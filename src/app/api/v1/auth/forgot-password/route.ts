import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always return a generic success response — never reveal whether the email exists.
  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  return NextResponse.json({ ok: true });
}
