import type { Category, QuestionBank } from "./types";

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

export async function fetchAdminQuestionBanks(): Promise<QuestionBank[]> {
  return unwrap(await fetch("/api/v1/question-banks?admin=true"));
}

export async function fetchCategories(): Promise<Category[]> {
  return unwrap(await fetch("/api/v1/categories"));
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
  description: string;
  categoryId: string;
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

export async function replaceQuestionBankFile(id: string, file: File): Promise<QuestionBank> {
  const formData = new FormData();
  formData.set("file", file);
  return unwrap(
    await fetch(`/api/v1/question-banks/${id}/file`, { method: "POST", body: formData }),
  );
}
