import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/** Converts guard errors (and anything else) to a proper HTTP response for a route handler catch block. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  console.error(err);
  return NextResponse.json(
    { error: "Internal server error", debug: err instanceof Error ? err.stack : String(err) },
    { status: 500 },
  );
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError("Not authenticated");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") throw new ForbiddenError("Admin access required");
  return session;
}

export async function requireStudent() {
  const session = await requireSession();
  if (session.user.role !== "STUDENT") throw new ForbiddenError("Student access required");
  return session;
}
