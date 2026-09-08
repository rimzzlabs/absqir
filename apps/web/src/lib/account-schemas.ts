import { z } from "zod";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth-schemas";

export const nameSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "That name is too long."),
});

export const newEmailSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(MAX_PASSWORD_LENGTH, "That password is too long."),
  signOutOthers: z.boolean(),
});

export type NameValues = z.infer<typeof nameSchema>;
export type NewEmailValues = z.infer<typeof newEmailSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
