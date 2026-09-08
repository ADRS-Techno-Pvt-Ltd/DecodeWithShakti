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

    // Don't hard-fail deploy startup (prestart runs this) — just skip the admin
    // step. Reference data below still seeds.
    console.warn("Seed: ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account.");
  } else {
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
  }

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
    { name: "CA Final — Law", slug: "ca-final-law" },
  ];

  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    await prisma.category.createMany({ data: categories });
    console.log(`Seeded ${categories.length} categories.`);
  } else {
    console.log(`Skipped category seed (${categoryCount} already present).`);
  }

  const subjects = [
    { name: "Accounting", slug: "accounting" },
    { name: "Advanced Accounting", slug: "advanced-accounting" },
    { name: "Corporate & Other Laws", slug: "corporate-and-other-laws" },
    { name: "Taxation", slug: "taxation" },
    { name: "Direct Tax", slug: "direct-tax" },
    { name: "Indirect Tax / GST", slug: "indirect-tax-gst" },
    { name: "Cost & Management Accounting", slug: "cost-and-management-accounting" },
    { name: "Auditing & Ethics", slug: "auditing-and-ethics" },
    { name: "Financial Management", slug: "financial-management" },
    { name: "Strategic Management", slug: "strategic-management" },
    { name: "Economics for Finance", slug: "economics-for-finance" },
    { name: "Financial Reporting", slug: "financial-reporting" },
    { name: "Strategic Financial Management", slug: "strategic-financial-management" },
    { name: "Business Correspondence & Reporting", slug: "business-correspondence-and-reporting" },
  ];

  const subjectCount = await prisma.subject.count();
  if (subjectCount === 0) {
    await prisma.subject.createMany({ data: subjects });
    console.log(`Seeded ${subjects.length} subjects.`);
  } else {
    console.log(`Skipped subject seed (${subjectCount} already present).`);
  }

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
