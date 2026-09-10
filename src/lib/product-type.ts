import type { ProductType } from "@/features/question-banks/types";

/** Shared display label for a QuestionBank.type value — used anywhere a product type is rendered. */
export function productTypeLabel(type: ProductType): string {
  switch (type) {
    case "TEST_SERIES":
      return "Test Series";
    case "MENTORSHIP":
      return "Mentorship";
    case "QUESTION_BANK":
    default:
      return "Question Bank";
  }
}
