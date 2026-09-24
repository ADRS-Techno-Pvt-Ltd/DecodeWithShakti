import { PrismaClient } from "./src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const rows = await prisma.freeResource.findMany({
  select: {
    id: true,
    title: true,
    slug: true,
    isPublished: true,
    filePath: true,
    answerKeyFilePath: true,
    answerKeyFileName: true,
    answerKeyFileSizeBytes: true,
    createdAt: true,
    updatedAt: true,
  },
  orderBy: { createdAt: "desc" },
});
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
