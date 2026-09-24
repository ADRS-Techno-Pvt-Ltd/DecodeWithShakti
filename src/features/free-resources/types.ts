export type Category = { id: string; name: string; slug: string };

export type Subject = { id: string; name: string; slug: string; categoryId: string | null };

export type FreeResource = {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string | null;
  category: Category | null;
  subjectId: string | null;
  subject: Subject | null;
  fileName: string;
  fileSizeBytes: number;
  answerKeyFileName: string | null;
  answerKeyFileSizeBytes: number | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  createdAt: string;
};
