import type { AnswerSheetStatus } from "./constants";

export type AnswerSheetListItem = {
  id: string;
  title: string;
  description: string;
  status: AnswerSheetStatus;
  submittedAt: string;
  evaluatedAt: string | null;
  studentFileName: string;
  evaluatedFileName: string | null;
  questionBank: { id: string; title: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
};

export type AdminAnswerSheetListItem = AnswerSheetListItem & {
  student: { id: string; name: string; email: string };
};