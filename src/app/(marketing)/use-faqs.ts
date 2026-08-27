"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPublishedFaqs } from "@/features/faqs/api";

export type FaqCard = { q: string; a: string };

/**
 * Returns the FAQ entries to render on the landing page: the admin-managed FAQs from the
 * database when any exist, otherwise the curated static `fallback`. `loading` is true only
 * on the first fetch — render nothing/skeleton then so the fallback never flashes before
 * the real content arrives.
 */
export function useFaqs(fallback: FaqCard[]): { faqs: FaqCard[]; loading: boolean } {
  const { data, isPending } = useQuery({
    queryKey: ["faqs", "published"],
    queryFn: fetchPublishedFaqs,
  });

  // FAQ content is low-risk to show stale, and the section sits below the fold — render the
  // curated fallback while the first fetch is in flight rather than an empty accordion.
  if (isPending) return { faqs: fallback, loading: true };
  if (!data || data.length === 0) return { faqs: fallback, loading: false };
  return { faqs: data.map((f) => ({ q: f.question, a: f.answer })), loading: false };
}
