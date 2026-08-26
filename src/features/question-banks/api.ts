import type { Category, QuestionBank } from "./types";

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.formErrors?.[0] ?? body?.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchAdminQuestionBanks(): Promise<QuestionBank[]> {
  return unwrap(await fetch("/api/v1/question-banks?admin=true"));
}

export async function fetchCategories(): Promise<Category[]> {
  return unwrap(await fetch("/api/v1/categories"));
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
