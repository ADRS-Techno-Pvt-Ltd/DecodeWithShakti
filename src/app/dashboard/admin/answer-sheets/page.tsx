import { prisma } from "@/lib/prisma";
import { AdminAnswerSheets } from "./admin-answer-sheets";

export default async function AdminAnswerSheetsPage() {
  const submissions = await prisma.answerSheetSubmission.findMany({
    include: {
      category: true,
      questionBank: { select: { id: true, title: true, slug: true } },
      student: { select: { id: true, name: true, email: true } },
      files: {
        select: { id: true, studentFileName: true, evaluatedFileName: true, status: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { submittedAt: "desc" },
  });
  return (
    <AdminAnswerSheets
      initialSubmissions={submissions.map((submission) => ({
        ...submission,
        submittedAt: submission.submittedAt.toISOString(),
      }))}
    />
  );
}
