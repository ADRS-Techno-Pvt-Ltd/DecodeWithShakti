"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllCategories, type Category } from "@/features/categories/api";

/**
 * Returns the real, admin-managed categories for footer/nav links. Falls back to a static
 * two-item list (Intermediate/Final) while the first fetch is in flight or on error, so the
 * footer never renders empty.
 */
export function useCategories(fallback: Category[]): { categories: Category[]; loading: boolean } {
  const { data, isPending } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: fetchAllCategories,
  });

  if (isPending) return { categories: fallback, loading: true };
  if (!data || data.length === 0) return { categories: fallback, loading: false };
  return { categories: data, loading: false };
}
