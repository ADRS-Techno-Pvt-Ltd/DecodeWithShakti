import type {
  AnswerKeySummary,
  Category,
  ProductType,
  QuestionBank,
  QuestionBankFileSummary,
  Subject,
} from "./types";

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (typeof body?.error === "string") {
      throw new Error(body.error);
    }
    const fieldError = Object.values(body?.error?.fieldErrors ?? {}).flat()[0];
    throw new Error(fieldError ?? body?.error?.formErrors?.[0] ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchAdminQuestionBanks(type?: ProductType): Promise<QuestionBank[]> {
  const query = new URLSearchParams({ admin: "true" });
  if (type) query.set("type", type);
  return unwrap(await fetch(`/api/v1/question-banks?${query.toString()}`));
}

export async function fetchCategories(): Promise<Category[]> {
  return unwrap(await fetch("/api/v1/categories"));
}

export async function fetchSubjects(): Promise<Subject[]> {
  return unwrap(await fetch("/api/v1/subjects"));
}

export async function createCategory(name: string): Promise<Category> {
  return unwrap(
    await fetch("/api/v1/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
}

export async function createQuestionBank(formData: FormData): Promise<QuestionBank> {
  return unwrap(await fetch("/api/v1/question-banks", { method: "POST", body: formData }));
}

export type QuestionBankUpdateInput = {
  title: string;
  type: ProductType;
  description: string;
  categoryId: string;
  subjectId?: string | null;
  price: number;
  previewEnabled: boolean;
  previewPageCount?: number;
  earlyBirdPrice?: number;
  earlyBirdEndsAt?: string;
  isPublished: boolean;
  isFeatured: boolean;
  features: string[];
};

export async function updateQuestionBank(
  id: string,
  input: QuestionBankUpdateInput,
): Promise<QuestionBank> {
  return unwrap(
    await fetch(`/api/v1/question-banks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteQuestionBank(id: string): Promise<void> {
  await unwrap(await fetch(`/api/v1/question-banks/${id}`, { method: "DELETE" }));
}

export async function replaceQuestionBankThumbnail(id: string, file: File): Promise<QuestionBank> {
  const formData = new FormData();
  formData.set("thumbnail", file);
  return unwrap(
    await fetch(`/api/v1/question-banks/${id}/thumbnail`, { method: "POST", body: formData }),
  );
}

export async function replaceQuestionBankFile(
  id: string,
  files: File[],
): Promise<QuestionBank> {
  const formData = new FormData();
  // Multiple PDFs are merged server-side into the single stored file, in order.
  files.forEach((file) => formData.append("file", file));
  return unwrap(
    await fetch(`/api/v1/question-banks/${id}/file`, { method: "POST", body: formData }),
  );
}

export async function addQuestionBankAnswerKeys(
  id: string,
  files: File[],
): Promise<{ id: string; title: string; fileName: string }[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("file", file));
  const body = await unwrap<{ answerKeys: { id: string; title: string; fileName: string }[] }>(
    await fetch(`/api/v1/question-banks/${id}/answer-key`, { method: "POST", body: formData }),
  );
  return body.answerKeys;
}

export async function deleteAnswerKey(id: string): Promise<void> {
  await unwrap(await fetch(`/api/v1/answer-keys/${id}`, { method: "DELETE" }));
}

/** Replace one answer key's PDF content in place — its id and download link are unchanged. */
export async function replaceAnswerKey(id: string, file: File): Promise<AnswerKeySummary> {
  const formData = new FormData();
  formData.set("file", file);
  return unwrap(await fetch(`/api/v1/answer-keys/${id}`, { method: "POST", body: formData }));
}

/** Add one or more new Test Series papers — existing papers are left untouched. */
export async function addQuestionBankFiles(
  id: string,
  files: File[],
): Promise<QuestionBankFileSummary[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("file", file));
  const body = await unwrap<{ files: QuestionBankFileSummary[] }>(
    await fetch(`/api/v1/question-banks/${id}/files`, { method: "POST", body: formData }),
  );
  return body.files;
}

/** Replace one Test Series paper's PDF content in place — its id and position are unchanged. */
export async function replaceQuestionBankFilePaper(
  questionBankId: string,
  fileId: string,
  file: File,
): Promise<QuestionBankFileSummary> {
  const formData = new FormData();
  formData.set("file", file);
  return unwrap(
    await fetch(`/api/v1/question-banks/${questionBankId}/files/${fileId}`, {
      method: "POST",
      body: formData,
    }),
  );
}

export async function deleteQuestionBankFilePaper(questionBankId: string, fileId: string): Promise<void> {
  await unwrap(
    await fetch(`/api/v1/question-banks/${questionBankId}/files/${fileId}`, { method: "DELETE" }),
  );
}
