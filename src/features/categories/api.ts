export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type CreateCategoryInput = {
  name: string;
  slug: string;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export async function fetchAllCategories(): Promise<Category[]> {
  const res = await fetch("/api/v1/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function createCategory(data: CreateCategoryInput): Promise<Category> {
  const res = await fetch("/api/v1/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create category");
  }
  return res.json();
}

export async function updateCategory(id: string, data: UpdateCategoryInput): Promise<Category> {
  const res = await fetch(`/api/v1/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update category");
  }
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/v1/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete category");
  }
}
