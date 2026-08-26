import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Next.js 16 renamed middleware.ts -> proxy.ts (Node runtime only). Cheap,
 * cookie/JWT-only checks live here (it runs on every prefetch) — real
 * DB-backed authorization stays in Server Actions/Route Handlers. See
 * root CLAUDE.md "Next.js 16 specifics".
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/dashboard/student") && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
