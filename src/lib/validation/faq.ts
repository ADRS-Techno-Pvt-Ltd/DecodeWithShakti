import { z } from "zod";

export const faqInputSchema = z.object({
  question: z.string().min(3).max(200).transform((v) => v.trim()),
  answer: z.string().min(3).max(2000).transform((v) => v.trim()),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isPublished: z.coerce.boolean().default(true),
});
export type FaqInput = z.infer<typeof faqInputSchema>;
