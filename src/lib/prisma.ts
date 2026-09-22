import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaAdapter?: PrismaPg;
};

const adapter =
  globalForPrisma.prismaAdapter ??
  new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Cached unconditionally, not just outside production: Turbopack has already been
// caught duplicating a package (cashfree-pg, see next.config.ts) across separate
// server chunks in production, one per route handler that imports it. If this module
// gets duplicated the same way, skipping the globalThis cache in production means
// every first-hit route creates its own PrismaClient + pg connection pool that never
// gets reused or GC'd — a slow leak (more distinct routes hit -> more pools alive)
// that matches an OOM after hours of uptime rather than a fast crash.
globalForPrisma.prismaAdapter = adapter;
globalForPrisma.prisma = prisma;
