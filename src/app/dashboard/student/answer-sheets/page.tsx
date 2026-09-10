import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudentAnswerSheets } from "./student-answer-sheets";

export default async function StudentAnswerSheetsPage() {
  const session = await auth();
  const purchases = await prisma.purchase.findMany({
    where: { userId: session!.user.id, status: "SUCCESS", questionBank: { type: "TEST_SERIES" } },
    select: {
      id: true,
      questionBank: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          fileName: true,
          category: { select: { id: true, name: true, slug: true } },
          answerKeys: {
            where: { isPublished: true, questionBankId: { not: null } },
            select: { id: true, title: true, fileName: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          answerSubmissions: {
            where: { studentId: session!.user.id },
            select: {
              id: true,
              status: true,
              studentFileName: true,
              evaluatedFileName: true,
              submittedAt: true,
              evaluatedAt: true,
            },
            orderBy: { submittedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const purchasesByQuestionBank = new Map<string, (typeof purchases)[number]>();
  for (const purchase of purchases) {
    if (!purchasesByQuestionBank.has(purchase.questionBank.id)) {
      purchasesByQuestionBank.set(purchase.questionBank.id, purchase);
    }
  }

  return (
    <StudentAnswerSheets
      series={[...purchasesByQuestionBank.values()].map((purchase) => {
        const submission = purchase.questionBank.answerSubmissions[0] ?? null;
        const answerKey = submission ? purchase.questionBank.answerKeys[0] ?? null : null;
        return {
          purchaseId: purchase.id,
          questionBank: {
            id: purchase.questionBank.id,
            title: purchase.questionBank.title,
            slug: purchase.questionBank.slug,
            description: purchase.questionBank.description,
            // TEST_SERIES products require a PDF at creation time. The fallback
            // keeps this existing student-only view type-safe after Mentorship
            // made catalog file fields nullable.
            fileName: purchase.questionBank.fileName ?? "",
            category: purchase.questionBank.category,
          },
          submission: submission
            ? {
                id: submission.id,
                status: submission.status,
                studentFileName: submission.studentFileName,
                evaluatedFileName: submission.evaluatedFileName,
                submittedAt: submission.submittedAt.toISOString(),
                evaluatedAt: submission.evaluatedAt?.toISOString() ?? null,
              }
            : null,
          answerKey,
        };
      })}
    />
  );
}
