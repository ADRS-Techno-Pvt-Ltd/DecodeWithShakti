import { z } from "zod";

// z.coerce.boolean() is a footgun for FormData string values: Boolean("false") is true.
function booleanField(defaultValue: boolean) {
  return z.preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean()).default(defaultValue);
}

// "" / "none" (from the form's placeholder option) and missing all mean "not set".
function optionalIdField() {
  return z.preprocess(
    (v) => (v == null || (typeof v === "string" && (v.trim() === "" || v === "none")) ? null : v),
    z.string().min(1).nullable(),
  ).optional();
}

const freeResourceBaseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string(),
  categoryId: optionalIdField(),
  subjectId: optionalIdField(),
  isPublished: booleanField(true),
});

export const freeResourceInputSchema = freeResourceBaseSchema;

// See CLAUDE.md / question-bank.ts: `.partial()` on an already-refined schema throws at
// runtime in zod v4. This schema has no refinements, so `.partial()` is safe directly —
// kept as a separate export for symmetry with the PATCH route's naming.
export const freeResourceUpdateSchema = freeResourceBaseSchema.partial();

export type FreeResourceInput = z.infer<typeof freeResourceInputSchema>;
