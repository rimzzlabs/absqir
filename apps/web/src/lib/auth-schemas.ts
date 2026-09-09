import { z } from "zod";

/** Matches minPasswordLength in packages/auth. */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
/** Matches OTP_LENGTH in packages/auth. */
export const CODE_LENGTH = 6;

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(MAX_PASSWORD_LENGTH, "That password is too long.");

const code = z
  .string()
  .length(CODE_LENGTH, `Enter the ${CODE_LENGTH} digit code.`)
  .regex(/^\d+$/, "Digits only.");

export const emailSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const passwordSchema = z.object({
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean(),
});

export const codeSchema = z.object({ code });

export const resetSchema = z.object({ code, password });

const fullName = z.string().trim().min(1, "Enter your name.").max(80, "That name is too long.");

/**
 * The profile step for an account that signs in with a provider. A password
 * is welcome and never asked for, so an empty field passes. The field starts
 * as an empty string, which is why `optional()` alone would not do: an empty
 * string is a value, and it would fail the length rule with no field on
 * screen to show the message.
 */
export const profileSchema = z.object({
  name: fullName,
  password: z
    .string()
    .max(MAX_PASSWORD_LENGTH, "That password is too long.")
    .refine(
      (value) => value.length === 0 || value.length >= MIN_PASSWORD_LENGTH,
      `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
    .optional(),
});

/** The same step for an account with no other way back in. */
export const profileWithPasswordSchema = z.object({ name: fullName, password });

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80, "That name is too long."),
  slug: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(40, "Use at most 40 characters.")
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Lowercase letters, digits, and hyphens only."),
});

export type EmailValues = z.infer<typeof emailSchema>;
export type PasswordValues = z.infer<typeof passwordSchema>;
export type CodeValues = z.infer<typeof codeSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type OrganizationValues = z.infer<typeof organizationSchema>;
