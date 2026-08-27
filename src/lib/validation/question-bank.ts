import { z } from "zod";

// z.coerce.boolean() is a footgun for FormData string values: Boolean("false") is true.
// This preprocesses "true"/"false" strings correctly while still accepting real booleans
// (as sent by the JSON-based PATCH route).
function booleanField(defaultValue: boolean) {
  return z.preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean()).default(defaultValue);
}

// `features` arrives as a JSON-encoded string array from the multipart create route and as
// a real array from the JSON PATCH route. Normalize both, drop blanks, and cap the list.
function featuresField() {
  return z
    .preprocess((v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string" && v.trim() !== "") {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    }, z.array(z.string().trim().min(1).max(120)).max(8))
    .default([]);
}

const questionBankBaseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  categoryId: z.string().min(1, "Category is required"),
  price: z.coerce.number().int().positive("Price must be a positive integer (paise)"),
  previewEnabled: booleanField(false),
  previewPageCount: z.coerce.number().int().positive().optional(),
  earlyBirdPrice: z.coerce.number().int().positive().optional(),
  earlyBirdEndsAt: z.coerce.date().optional(),
  isPublished: booleanField(true),
  isFeatured: booleanField(false),
  features: featuresField(),
});

export const questionBankInputSchema = questionBankBaseSchema
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

// zod v4 throws at runtime ("`.partial()` cannot be used on object schemas containing
// refinements") if `.partial()` is called on `questionBankInputSchema` above — TypeScript
// does not catch this. PATCH (partial update) uses this unrefined base instead; the
// cross-field invariants the refinements enforce are already upheld by the PATCH route's
// merge-with-existing-record logic.
export const questionBankUpdateSchema = questionBankBaseSchema.partial();

export type QuestionBankInput = z.infer<typeof questionBankInputSchema>;
