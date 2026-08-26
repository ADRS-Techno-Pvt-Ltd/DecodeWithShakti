import { mkdir, readFile, writeFile, rm } from "fs/promises";

const STORAGE_ROOT = (process.env.STORAGE_ROOT ?? "./storage").replace(/\/+$/, "");

/**
 * Always joins with forward slashes and stores paths that way, regardless of OS —
 * Node's fs APIs accept "/" on Windows too, so this keeps stored DB paths portable
 * between a Windows dev machine and a Linux VPS in production.
 */
function resolvePath(...segments: string[]): string {
  return [STORAGE_ROOT, ...segments].join("/");
}

export function questionBankDir(questionBankId: string): string {
  return resolvePath("questionbanks", questionBankId);
}

export function originalFilePath(questionBankId: string): string {
  return resolvePath("questionbanks", questionBankId, "original.pdf");
}

export function previewFilePath(questionBankId: string): string {
  return resolvePath("questionbanks", questionBankId, "preview.pdf");
}

export function thumbnailFilePath(questionBankId: string, ext: string): string {
  return resolvePath("questionbanks", questionBankId, `thumbnail.${ext}`);
}

export function invoiceFilePath(invoiceNumber: string): string {
  return resolvePath("invoices", `${invoiceNumber}.pdf`);
}

export async function saveOriginalFile(questionBankId: string, bytes: Buffer): Promise<string> {
  await mkdir(questionBankDir(questionBankId), { recursive: true });
  const filePath = originalFilePath(questionBankId);
  await writeFile(filePath, bytes);
  return filePath;
}

export async function savePreviewFile(questionBankId: string, bytes: Uint8Array): Promise<string> {
  await mkdir(questionBankDir(questionBankId), { recursive: true });
  const filePath = previewFilePath(questionBankId);
  await writeFile(filePath, bytes);
  return filePath;
}

export async function saveThumbnailFile(
  questionBankId: string,
  bytes: Buffer,
  ext: string,
): Promise<string> {
  await mkdir(questionBankDir(questionBankId), { recursive: true });
  const filePath = thumbnailFilePath(questionBankId, ext);
  await writeFile(filePath, bytes);
  return filePath;
}

export async function readStoredFile(filePath: string): Promise<Buffer> {
  return readFile(filePath);
}

export async function saveInvoiceFile(invoiceNumber: string, bytes: Uint8Array): Promise<string> {
  await mkdir(resolvePath("invoices"), { recursive: true });
  const filePath = invoiceFilePath(invoiceNumber);
  await writeFile(filePath, bytes);
  return filePath;
}

export async function deleteQuestionBankFiles(questionBankId: string): Promise<void> {
  await rm(questionBankDir(questionBankId), { recursive: true, force: true });
}
