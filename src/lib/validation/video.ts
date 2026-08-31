import { z } from "zod";
import { extractYouTubeId } from "@/lib/youtube";

// z.coerce.boolean() is a footgun for FormData string values: Boolean("false") is true.
// This preprocesses "true"/"false" strings correctly while still accepting real booleans
// (as sent by the JSON-based PATCH route).
function booleanField(defaultValue: boolean) {
  return z.preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean()).default(defaultValue);
}

const videoBaseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string(),
  categoryId: z.string().min(1).optional(),
  sourceType: z.enum(["YOUTUBE", "UPLOAD"]),
  youtubeUrl: z.string().optional(),
  isPublished: booleanField(true),
  isFeatured: booleanField(false),
});

export const videoInputSchema = videoBaseSchema.refine(
  (data) => data.sourceType !== "YOUTUBE" || extractYouTubeId(data.youtubeUrl ?? "") != null,
  { message: "Enter a valid YouTube video URL", path: ["youtubeUrl"] },
);

// zod v4 throws at runtime if `.partial()` is called on a schema built with `.refine()` —
// PATCH (partial update) uses the unrefined base instead, matching questionBankUpdateSchema.
// `sourceType` is immutable after creation (switching YOUTUBE <-> UPLOAD needs a new file
// upload, not a metadata edit); `youtubeUrl` can still be edited to fix a typo'd link.
export const videoUpdateSchema = videoBaseSchema.omit({ sourceType: true }).partial();

export type VideoInput = z.infer<typeof videoInputSchema>;
