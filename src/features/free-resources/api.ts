import type { Category, FreeResource, Subject } from "./types";

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

export async function fetchAdminFreeResources(): Promise<FreeResource[]> {
  return unwrap(await fetch("/api/v1/free-resources?admin=true"));
}

export async function fetchCategories(): Promise<Category[]> {
  return unwrap(await fetch("/api/v1/categories"));
}

export async function fetchSubjects(): Promise<Subject[]> {
  return unwrap(await fetch("/api/v1/subjects"));
}

export async function createFreeResource(formData: FormData): Promise<FreeResource> {
  return unwrap(await fetch("/api/v1/free-resources", { method: "POST", body: formData }));
}

export type FreeResourceUpdateInput = {
  title: string;
  description: string;
  categoryId?: string | null;
  subjectId?: string | null;
  isPublished: boolean;
};

export async function updateFreeResource(id: string, input: FreeResourceUpdateInput): Promise<FreeResource> {
  return unwrap(
    await fetch(`/api/v1/free-resources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteFreeResource(id: string): Promise<void> {
  await unwrap(await fetch(`/api/v1/free-resources/${id}`, { method: "DELETE" }));
}

export async function replaceFreeResourceThumbnail(id: string, file: File): Promise<FreeResource> {
  const formData = new FormData();
  formData.set("thumbnail", file);
  return unwrap(await fetch(`/api/v1/free-resources/${id}/thumbnail`, { method: "POST", body: formData }));
}

export async function replaceFreeResourceFile(id: string, file: File): Promise<FreeResource> {
  const formData = new FormData();
  formData.set("file", file);
  return unwrap(await fetch(`/api/v1/free-resources/${id}/file`, { method: "POST", body: formData }));
}

export async function addOrReplaceFreeResourceAnswerKey(id: string, file: File): Promise<FreeResource> {
  const formData = new FormData();
  formData.set("file", file);
  return unwrap(await fetch(`/api/v1/free-resources/${id}/answer-key`, { method: "POST", body: formData }));
}

export async function deleteFreeResourceAnswerKey(id: string): Promise<FreeResource> {
  return unwrap(await fetch(`/api/v1/free-resources/${id}/answer-key`, { method: "DELETE" }));
}
