import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Runs before `npm run dev` (see package.json predev). It creates or promotes
// the ADMIN_EMAIL account from the environment. Never throws — a missing DB or
// missing env vars just logs and exits 0 so app startup is never blocked.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("ensure-admin: ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash, role: "ADMIN" },
    });
    console.log(`ensure-admin: updated admin account ${email}.`);
    return;
  }

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
