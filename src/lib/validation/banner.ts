import { z } from "zod";

// z.coerce.boolean() is a footgun for FormData string values: Boolean("false") is true.
function booleanField(defaultValue: boolean) {
  return z.preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean()).default(defaultValue);
}

export const bannerInputSchema = z.object({
  linkUrl: z.union([z.literal(""), z.string().url()]).optional(),
  altText: z.string().max(200).default(""),
  isPublished: booleanField(true),
});

export const bannerUpdateSchema = z.object({
  linkUrl: z.union([z.literal(""), z.string().url()]).optional(),
  altText: z.string().max(200).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type BannerInput = z.infer<typeof bannerInputSchema>;
