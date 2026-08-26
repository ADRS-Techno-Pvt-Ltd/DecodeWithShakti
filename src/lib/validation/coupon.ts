import { z } from "zod";

export const couponInputSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(32)
    .transform((v) => v.toUpperCase().trim()),
  discountType: z.enum(["PERCENT", "FLAT"]),
  discountValue: z.coerce.number().int().positive(),
  expiresAt: z.coerce.date(),
  usageLimit: z.coerce.number().int().positive(),
  isActive: z.coerce.boolean().default(true),
});
export type CouponInput = z.infer<typeof couponInputSchema>;

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  questionBankId: z.string().min(1),
});
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
