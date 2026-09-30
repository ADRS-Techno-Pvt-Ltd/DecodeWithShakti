import { prisma } from "@/lib/prisma";

export type PurchasedDownload = {
  label: string;
  href: string;
  kind: "file" | "answer-key";
};

/**
 * For a logged-in student, the download buttons each purchased product should
 * show on the catalog. Mirrors the rules on the My Purchases page: the same
 * files, the same answer keys, the same Test Series unlock (answer keys appear
 * only once an answer sheet has been submitted).
 */
export async function getPurchasedDownloads(
  userId: string,
  questionBankIds: string[],
): Promise<Record<string, PurchasedDownload[]>> {
  if (questionBankIds.length === 0) return {};

  const purchases = await prisma.purchase.findMany({
    where: { userId, status: "SUCCESS", questionBankId: { in: questionBankIds } },
    orderBy: { createdAt: "desc" },
    include: {
      questionBank: {
        select: {
          type: true,
          filePath: true,
          files: { select: { id: true }, orderBy: { createdAt: "asc" } },
          answerKeys: {
            where: { isPublished: true, questionBankId: { not: null } },
            select: { id: true, questionBankFileId: true },
            orderBy: { createdAt: "asc" },
          },
          answerSubmissions: {
            where: { studentId: userId },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  const result: Record<string, PurchasedDownload[]> = {};
  for (const p of purchases) {
    if (result[p.questionBankId]) continue; // newest successful purchase wins
    const qb = p.questionBank;
    const downloads: PurchasedDownload[] = [];

    if (
      qb.type === "QUESTION_BANK" ||
      (qb.type === "TEST_SERIES" && qb.files.length === 0 && qb.filePath)
    ) {
      downloads.push({ label: "Download", href: `/api/v1/files/download/${p.id}`, kind: "file" });
    }

    if (qb.type === "TEST_SERIES") {
      qb.files.forEach((paper, index) => {
        downloads.push({
          label: qb.files.length > 1 ? `Paper ${index + 1}` : "Download",
          href: `/api/v1/files/question-bank-papers/${paper.id}`,
          kind: "file",
        });
      });
    }

    if (qb.type === "QUESTION_BANK" || (qb.type === "TEST_SERIES" && qb.answerSubmissions.length > 0)) {
      qb.answerKeys.forEach((key, index) => {
        const paperNo = qb.files.findIndex((f) => f.id === key.questionBankFileId) + 1 || index + 1;
        downloads.push({
          label: qb.answerKeys.length > 1 ? `Answer Key ${paperNo}` : "Answer Key",
          href: `/api/v1/files/answer-keys/${key.id}`,
          kind: "answer-key",
        });
      });
    }

    result[p.questionBankId] = downloads;
  }
  return result;
}
