export type Faq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

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

/** Published FAQs in display order — used by the public landing page. */
export async function fetchPublishedFaqs(): Promise<Faq[]> {
  return unwrap(await fetch("/api/v1/faqs"));
}

/** Every FAQ (admin only). */
export async function fetchAllFaqs(): Promise<Faq[]> {
  return unwrap(await fetch("/api/v1/faqs?all=true"));
}

export type FaqInput = {
  question: string;
  answer: string;
  sortOrder?: number;
  isPublished?: boolean;
};

export async function createFaq(input: FaqInput): Promise<Faq> {
  return unwrap(
    await fetch("/api/v1/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateFaq(id: string, input: Partial<FaqInput>): Promise<Faq> {
  return unwrap(
    await fetch(`/api/v1/faqs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteFaq(id: string): Promise<void> {
  await unwrap(await fetch(`/api/v1/faqs/${id}`, { method: "DELETE" }));
}
