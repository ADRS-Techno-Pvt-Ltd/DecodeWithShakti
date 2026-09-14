import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "STUDENT";
      /** Set when an admin is viewing this account via "View as user"; the real admin's id. */
      impersonatorId?: string | null;
      impersonatorEmail?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "STUDENT";
    impersonatorId?: string | null;
    impersonatorEmail?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "STUDENT";
    impersonatorId?: string | null;
    impersonatorEmail?: string | null;
  }
}
