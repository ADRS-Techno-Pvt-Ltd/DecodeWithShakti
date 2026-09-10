export type Category = { id: string; name: string; slug: string };

export type Subject = { id: string; name: string; slug: string; categoryId: string | null };

export type ProductType = "QUESTION_BANK" | "TEST_SERIES" | "MENTORSHIP";

export type QuestionBank = {
  id: string;
  title: string;
  type: ProductType;
  slug: string;
  description: string;
  categoryId: string;
  category: Category;
  subjectId: string | null;
  subject: Subject | null;
  price: number;
  earlyBirdPrice: number | null;
  earlyBirdEndsAt: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  totalPages: number | null;
  previewEnabled: boolean;
  previewPageCount: number | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  features: string[];
  createdAt: string;
};
