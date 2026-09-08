export type Category = { id: string; name: string; slug: string };

export type Subject = { id: string; name: string; slug: string; categoryId: string | null };

export type ProductType = "QUESTION_BANK" | "TEST_SERIES";

export type QuestionBank = {
  id: string;
  title: string;
  type: ProductType;
  slug: string;
  description: string;
  categoryId: string;
  category: Category;
  subjectId: string | null;
  price: number;
  earlyBirdPrice: number | null;
  earlyBirdEndsAt: string | null;
  fileName: string;
  fileSizeBytes: number;
  totalPages: number | null;
  previewEnabled: boolean;
  previewPageCount: number | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  features: string[];
  createdAt: string;
};
