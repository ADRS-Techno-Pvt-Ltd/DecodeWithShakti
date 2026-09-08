export const ANSWER_SHEET_CATEGORY_SLUGS = [
  "ca-final-audit",
  "ca-final-law",
  "ca-inter-costing",
  "ca-inter-taxation",
] as const;

export const ANSWER_SHEET_CATEGORIES = [
  { slug: "ca-final-audit", label: "CA Final - Audit" },
  { slug: "ca-final-law", label: "CA Final - Law" },
  { slug: "ca-inter-costing", label: "CA Inter - Costing" },
  { slug: "ca-inter-taxation", label: "CA Inter - Taxation" },
] as const;

export const ANSWER_SHEET_STATUSES = ["PENDING_EVALUATION", "EVALUATED"] as const;

export type AnswerSheetStatus = (typeof ANSWER_SHEET_STATUSES)[number];

export function isAnswerSheetCategorySlug(value: string): boolean {
  return (ANSWER_SHEET_CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function answerSheetCategoryLabel(slug: string, fallback: string): string {
  return ANSWER_SHEET_CATEGORIES.find((category) => category.slug === slug)?.label ?? fallback;
}