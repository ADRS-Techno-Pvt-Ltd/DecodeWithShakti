import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Name is too short").max(100),
  email: z.string().email(),
  subject: z.string().min(3, "Subject is too short").max(150),
  message: z.string().min(10, "Message is too short").max(4000),
});
export type ContactInput = z.infer<typeof contactSchema>;
