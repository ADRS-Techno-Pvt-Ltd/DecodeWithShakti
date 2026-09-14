import { z } from "zod";

export const promotionSettingInputSchema = z.object({
  productType: z.enum(["QUESTION_BANK", "TEST_SERIES", "MENTORSHIP"]),
  multiItemDiscountEnabled: z.coerce.boolean(),
  multiItemDiscountPercent: z.coerce.number().int().min(0).max(100),
  minQualifyingItems: z.coerce.number().int().min(2).optional(),
});
export type PromotionSettingInput = z.infer<typeof promotionSettingInputSchema>;
