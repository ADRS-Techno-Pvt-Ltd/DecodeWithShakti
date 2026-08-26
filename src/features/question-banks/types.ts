export type Category = { id: string; name: string; slug: string };

export type QuestionBank = {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  category: Category;
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
  createdAt: string;
};
