import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Runs before `npm run dev` / `npm start` (see package.json predev/prestart).
// If the ADMIN_EMAIL account from the environment is not already in the database,
// it is created. Existing accounts are left untouched. Never throws — a missing
// DB or missing env vars just logs and exits 0 so app startup is never blocked.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("ensure-admin: ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log(`ensure-admin: admin ${email} already present — nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name: "Admin", email, passwordHash, role: "ADMIN" },
  });
  console.log(`ensure-admin: created admin account ${email}.`);
}

main()
  .catch((err) => {
    console.warn("ensure-admin: skipped due to error —", err instanceof Error ? err.message : err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
