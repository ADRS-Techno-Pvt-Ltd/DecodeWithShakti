import { z } from "zod";

export const answerSheetInputSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  description: z.string().trim().min(1, "Description is required.").max(5000),
  categoryId: z.string().min(1, "Category is required."),
});

export const answerSubmissionInputSchema = z.object({
  questionBankId: z.string().min(1, "Test Series is required."),
});

export const answerKeyInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1).max(5000),
  questionBankId: z.string().min(1, "Test Series is required."),
});

export const MAX_ANSWER_SHEET_BYTES =
  Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024;

export async function readPdfUpload(value: FormDataEntryValue | null): Promise<Buffer> {
  if (!(value instanceof File)) {
    throw new Error("A PDF file is required.");
  }
  if (value.size === 0) {
    throw new Error("The PDF file is empty.");
  }
  if (value.size > MAX_ANSWER_SHEET_BYTES) {
    throw new Error(`File exceeds the ${process.env.MAX_UPLOAD_MB ?? 50}MB limit.`);
  }
  if (value.type !== "application/pdf" || !value.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are accepted.");
  }

  const bytes = Buffer.from(await value.arrayBuffer());
  if (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("The uploaded file is not a valid PDF.");
  }
  return bytes;
}