import type { AnswerSheetStatus } from "./constants";

export type AnswerSheetFileItem = {
  id: string;
  studentFileName: string;
  evaluatedFileName: string | null;
  status: AnswerSheetStatus;
};

export type AnswerSheetListItem = {
  id: string;
  title: string;
  description: string;
  submittedAt: string;
  questionBank: { id: string; title: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
  files: AnswerSheetFileItem[];
};

export type AdminAnswerSheetListItem = AnswerSheetListItem & {
  student: { id: string; name: string; email: string };
};
