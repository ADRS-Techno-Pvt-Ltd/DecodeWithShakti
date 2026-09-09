import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";
import { rateLimit } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  basePath: "/api/v1/auth",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // 10 attempts / 5 min per email — blocks credential-stuffing against one account.
        if (!rateLimit(`login:${parsed.data.email.toLowerCase()}`, 10, 5 * 60 * 1000)) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),

    /**
     * Admin "View as user" — no password. `authorize` re-checks the CURRENT
     * session server-side: only a logged-in ADMIN can start impersonating, and
     * only non-admin accounts can be targeted (no admin-to-admin takeover). The
     * resulting session carries `impersonatorId` so every downstream request
     * still knows the real actor (used by `blockImpersonation` guards + the
     * "Viewing as…" banner). Each start writes an ImpersonationSession audit row.
     */
    Credentials({
      id: "impersonate",
      name: "Impersonate",
      credentials: { userId: { label: "User ID", type: "text" } },
      async authorize(credentials) {
        const targetId = typeof credentials?.userId === "string" ? credentials.userId : null;
        if (!targetId) return null;

        const current = await auth();
        if (!current?.user || current.user.role !== "ADMIN" || current.user.impersonatorId) {
          return null;
        }

        const target = await prisma.user.findUnique({ where: { id: targetId } });
        if (!target || target.role === "ADMIN") return null;

        await prisma.impersonationSession.create({
          data: { adminId: current.user.id, targetUserId: target.id },
        });

        return {
          id: target.id,
          name: target.name,
          email: target.email,
          role: target.role,
          impersonatorId: current.user.id,
          impersonatorEmail: current.user.email ?? null,
        };
      },
    }),

    /**
     * Exit impersonation — restores the admin session recorded in
     * `impersonatorId` (no password needed) and closes the open audit row.
     */
    Credentials({
      id: "stop-impersonate",
      name: "Stop impersonating",
      credentials: {},
      async authorize() {
        const current = await auth();
        const impersonatorId = current?.user?.impersonatorId;
        if (!current?.user || !impersonatorId) return null;

        const admin = await prisma.user.findUnique({ where: { id: impersonatorId } });
        if (!admin || admin.role !== "ADMIN") return null;

        await prisma.impersonationSession.updateMany({
          where: { adminId: admin.id, targetUserId: current.user.id, endedAt: null },
          data: { endedAt: new Date() },
        });

        return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as "ADMIN" | "STUDENT";
        // Present only on an "impersonate" sign-in; a normal login / "stop-impersonate"
        // sign-in passes a plain user, which resets these to null.
        token.impersonatorId = (user as { impersonatorId?: string | null }).impersonatorId ?? null;
        token.impersonatorEmail =
          (user as { impersonatorEmail?: string | null }).impersonatorEmail ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "ADMIN" | "STUDENT";
      session.user.impersonatorId = (token.impersonatorId as string | null) ?? null;
      session.user.impersonatorEmail = (token.impersonatorEmail as string | null) ?? null;
      return session;
    },
  },
});
