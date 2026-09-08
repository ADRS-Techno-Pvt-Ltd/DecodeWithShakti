export type Subject = {
  id: string;
  name: string;
  slug: string;
  categoryId: string | null;
  category?: { id: string; name: string; slug: string } | null;
  _count?: { questionBanks: number };
};

export type CreateSubjectInput = {
  name: string;
  slug: string;
  categoryId?: string | null;
};

export type UpdateSubjectInput = Partial<CreateSubjectInput>;

export async function fetchAllSubjects(): Promise<Subject[]> {
  const res = await fetch("/api/v1/subjects");
  if (!res.ok) throw new Error("Failed to fetch subjects");
  return res.json();
}

export async function createSubject(data: CreateSubjectInput): Promise<Subject> {
  const res = await fetch("/api/v1/subjects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create subject");
  }
  return res.json();
}

export async function updateSubject(id: string, data: UpdateSubjectInput): Promise<Subject> {
  const res = await fetch(`/api/v1/subjects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update subject");
  }
  return res.json();
}

export async function deleteSubject(id: string): Promise<void> {
  const res = await fetch(`/api/v1/subjects/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete subject");
  }
}
