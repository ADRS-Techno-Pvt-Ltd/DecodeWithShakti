import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
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

  const email2 = process.env.ADMIN2_EMAIL?.trim().toLowerCase();
  const password2 = process.env.ADMIN2_PASSWORD;
  if (email2 && password2) {
    const passwordHash2 = await bcrypt.hash(password2, 12);
    await prisma.user.upsert({
      where: { email: email2 },
      update: {},
      create: {
        name: "Admin",
        email: email2,
        passwordHash: passwordHash2,
        role: "ADMIN",
      },
    });
    console.log(`Seeded admin account: ${email2}`);
  }

  const categories = [
    { name: "CA Inter — Costing", slug: "ca-inter-costing" },
    { name: "CA Inter — Taxation", slug: "ca-inter-taxation" },
    { name: "CA Inter — Accounts", slug: "ca-inter-accounts" },
    { name: "CA Final — Audit", slug: "ca-final-audit" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} categories.`);

  // FAQ — seed the initial set only if an admin hasn't started managing them yet.
  const faqCount = await prisma.faqItem.count();
  if (faqCount === 0) {
    const faqs = [
      {
        question: "What exactly do I get after buying a question bank?",
        answer:
          "A downloadable PDF of the full question bank, watermarked with your registered email, plus an auto-generated invoice for the purchase. Both stay available on your student dashboard for future downloads.",
      },
      {
        question: "How does early-bird pricing work?",
        answer:
          "Select banks launch with a discounted price and a visible deadline. Buy before it passes and you're charged the discounted amount automatically — after that, the price reverts to regular with no action needed from you.",
      },
      {
        question: "Can I preview a bank before paying?",
        answer:
          "Yes — every bank with preview enabled shows a set number of real pages for free, so you can judge difficulty and format before you buy. The full file only unlocks after a successful purchase.",
      },
      {
        question: "Why is my download watermarked with my email?",
        answer:
          "It's a light, diagonal watermark on every page identifying your copy as yours — it doesn't interfere with reading or printing, and it's what lets us keep prices fair for everyone by discouraging file sharing.",
      },
      {
        question: "Do you offer coupon codes?",
        answer:
          "Occasionally, yes. When a coupon is active you can enter it at checkout to see the discount applied before you confirm payment. Codes have an expiry date and a limited number of uses, so they may run out.",
      },
    ];
    await prisma.faqItem.createMany({
      data: faqs.map((f, i) => ({ ...f, sortOrder: i })),
    });
    console.log(`Seeded ${faqs.length} FAQ items.`);
  } else {
    console.log(`Skipped FAQ seed (${faqCount} already present).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
