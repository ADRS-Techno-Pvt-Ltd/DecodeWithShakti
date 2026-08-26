import { z } from "zod";

// z.coerce.boolean() is a footgun for FormData string values: Boolean("false") is true.
// This preprocesses "true"/"false" strings correctly while still accepting real booleans
// (as sent by the JSON-based PATCH route).
function booleanField(defaultValue: boolean) {
  return z.preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean()).default(defaultValue);
}

export const questionBankInputSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(2000),
    categoryId: z.string().min(1, "Category is required"),
    price: z.coerce.number().int().positive("Price must be a positive integer (paise)"),
    previewEnabled: booleanField(false),
    previewPageCount: z.coerce.number().int().positive().optional(),
    earlyBirdPrice: z.coerce.number().int().positive().optional(),
    earlyBirdEndsAt: z.coerce.date().optional(),
    isPublished: booleanField(true),
  })
  .refine((data) => !data.previewEnabled || data.previewPageCount != null, {
    message: "previewPageCount is required when previewEnabled is true",
    path: ["previewPageCount"],
  })
  .refine((data) => (data.earlyBirdPrice == null) === (data.earlyBirdEndsAt == null), {
    message: "earlyBirdPrice and earlyBirdEndsAt must be set together",
    path: ["earlyBirdEndsAt"],
  })
  .refine((data) => data.earlyBirdPrice == null || data.earlyBirdPrice < data.price, {
    message: "earlyBirdPrice must be less than the regular price",
    path: ["earlyBirdPrice"],
  });

export type QuestionBankInput = z.infer<typeof questionBankInputSchema>;
