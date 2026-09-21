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
          filePath: true,
          category: { select: { id: true, name: true, slug: true } },
          files: {
            select: { id: true, fileName: true },
            orderBy: { createdAt: "asc" },
          },
          answerKeys: {
            where: { isPublished: true, questionBankId: { not: null } },
            select: { id: true, title: true, fileName: true },
            orderBy: { createdAt: "asc" },
          },
          answerSubmissions: {
            where: { studentId: session!.user.id },
            select: {
              id: true,
              submittedAt: true,
              files: {
                select: { id: true, studentFileName: true, evaluatedFileName: true, status: true, evaluatedAt: true },
                orderBy: { createdAt: "asc" },
              },
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
        const answerKeys = submission ? purchase.questionBank.answerKeys : [];
        return {
          purchaseId: purchase.id,
          questionBank: {
            id: purchase.questionBank.id,
            title: purchase.questionBank.title,
            slug: purchase.questionBank.slug,
            description: purchase.questionBank.description,
            category: purchase.questionBank.category,
            files: purchase.questionBank.files,
            legacyDownloadAvailable: purchase.questionBank.files.length === 0 && !!purchase.questionBank.filePath,
          },
          submission: submission
            ? {
                id: submission.id,
                submittedAt: submission.submittedAt.toISOString(),
                status:
                  submission.files.length > 0 && submission.files.every((f) => f.status === "EVALUATED")
                    ? ("EVALUATED" as const)
                    : ("PENDING_EVALUATION" as const),
                evaluatedAt:
                  submission.files
                    .map((f) => f.evaluatedAt)
                    .filter((d): d is Date => d != null)
                    .sort((a, b) => b.getTime() - a.getTime())[0]
                    ?.toISOString() ?? null,
                files: submission.files.map((f) => ({
                  id: f.id,
                  studentFileName: f.studentFileName,
                  evaluatedFileName: f.evaluatedFileName,
                  status: f.status,
                })),
              }
            : null,
          answerKeys,
        };
      })}
    />
  );
}
