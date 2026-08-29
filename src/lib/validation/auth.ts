import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(100),
  email: z.string().email(),
  caRegistrationNumber: z.string().length(10, "CA registration number must be exactly 10 characters").regex(/^[A-Z]{3}\d{7}$/, "Invalid format. Example: NRO1234567"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm"),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export const updateEmailSchema = z.object({
  newEmail: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password to confirm"),
});
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;