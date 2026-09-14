import { prisma } from "@/lib/prisma";
import { readStoredFile, savePreviewFile } from "@/lib/storage";
import { buildPreview, getPageCount } from "@/lib/preview";

/**
 * Test Series papers are stored as separate `QuestionBankFile` rows so each one
 * can be downloaded, added, and replaced independently. The legacy single-file
 * fields on `QuestionBank` (fileName/filePath/fileSizeBytes/totalPages,
 * previewFilePath) are kept mirrored to the first uploaded paper — the catalog
 * preview always renders from that one file, and anything still reading the
 * legacy fields sees a sensible "primary file" value.
 *
 * Call this after any add/replace/delete of a Test Series's papers.
 */
export async function syncQuestionBankPrimaryFile(questionBankId: string): Promise<void> {
  const bank = await prisma.questionBank.findUnique({
    where: { id: questionBankId },
    select: { previewEnabled: true, previewPageCount: true },
  });
  if (!bank) return;

  const firstFile = await prisma.questionBankFile.findFirst({
    where: { questionBankId },
    orderBy: { createdAt: "asc" },
  });

  if (!firstFile) {
    await prisma.questionBank.update({
      where: { id: questionBankId },
      data: { fileName: null, filePath: null, fileSizeBytes: null, totalPages: null, previewFilePath: null },
    });
    return;
  }

  const bytes = await readStoredFile(firstFile.filePath);
  const totalPages = await getPageCount(bytes);
  let previewFilePath: string | null = null;
  if (bank.previewEnabled && bank.previewPageCount) {
    const previewBytes = await buildPreview(bytes, Math.min(bank.previewPageCount, totalPages));
    previewFilePath = await savePreviewFile(questionBankId, previewBytes);
  }

  await prisma.questionBank.update({
    where: { id: questionBankId },
    data: {
      fileName: firstFile.fileName,
      filePath: firstFile.filePath,
      fileSizeBytes: firstFile.fileSizeBytes,
      totalPages,
      previewFilePath,
    },
  });
}
