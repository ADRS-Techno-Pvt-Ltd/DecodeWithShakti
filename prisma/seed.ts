import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin account.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Admin",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Seeded admin account: ${email}`);

  const categories = [
    { name: "CA Foundation", slug: "ca-foundation" },
    { name: "CA Inter — Costing", slug: "ca-inter-costing" },
    { name: "CA Inter — Taxation", slug: "ca-inter-taxation" },
    { name: "CA Inter — Accounts", slug: "ca-inter-accounts" },
    { name: "CA Final — Audit", slug: "ca-final-audit" },
    { name: "CA Final — Law", slug: "ca-final-law" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} categories.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
