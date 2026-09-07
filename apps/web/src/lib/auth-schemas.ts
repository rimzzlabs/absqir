import { z } from "zod";

/** Matches minPasswordLength in packages/auth. */
export const MIN_PASSWORD_LENGTH = 12;

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean(),
});

export const signUpSchema = z.object({
  name: z.string().min(1, "Enter your name.").max(80, "That name is too long."),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(128, "That password is too long."),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
