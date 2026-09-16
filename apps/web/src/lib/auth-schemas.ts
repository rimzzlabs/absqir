import { isReservedSlug } from "@absqir/core/org-path";
import { SLUG_PATTERN } from "@absqir/core/slug";
import type { Translate } from "@absqir/i18n";
import { z } from "zod";

/** Matches minPasswordLength in packages/auth. */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
/** Matches OTP_LENGTH in packages/auth. */
export const CODE_LENGTH = 6;

/**
 * Every schema here is a function of the reader's language, because the
 * message a rule carries is what the reader sees under the field.
 */
function password(t: Translate) {
  return z
    .string()
    .min(MIN_PASSWORD_LENGTH, t("auth:validation.passwordShort", { count: MIN_PASSWORD_LENGTH }))
    .max(MAX_PASSWORD_LENGTH, t("auth:validation.passwordLong"));
}

function code(t: Translate) {
  return z
    .string()
    .length(CODE_LENGTH, t("auth:validation.codeLength", { count: CODE_LENGTH }))
    .regex(/^\d+$/, t("auth:validation.digitsOnly"));
}

export function emailSchema(t: Translate) {
  return z.object({
    email: z.email(t("common:validation.emailInvalid")),
  });
}

export function passwordSchema(t: Translate) {
  return z.object({
    password: z.string().min(1, t("auth:validation.passwordRequired")),
    rememberMe: z.boolean(),
  });
}

export function codeSchema(t: Translate) {
  return z.object({ code: code(t) });
}

export function resetSchema(t: Translate) {
  return z.object({ code: code(t), password: password(t) });
}

function fullName(t: Translate) {
  return z
    .string()
    .trim()
    .min(1, t("auth:validation.nameRequired"))
    .max(80, t("common:validation.nameTooLong"));
}

/**
 * The profile step for an account that signs in with a provider. A password
 * is welcome and never asked for, so an empty field passes. The field starts
 * as an empty string, which is why `optional()` alone would not do: an empty
 * string is a value, and it would fail the length rule with no field on
 * screen to show the message.
 */
export function profileSchema(t: Translate) {
  return z.object({
    name: fullName(t),
    password: z
      .string()
      .max(MAX_PASSWORD_LENGTH, t("auth:validation.passwordLong"))
      .refine(
        (value) => value.length === 0 || value.length >= MIN_PASSWORD_LENGTH,
        t("auth:validation.passwordShort", { count: MIN_PASSWORD_LENGTH }),
      )
      .optional(),
  });
}

/** The same step for an account with no other way back in. */
export function profileWithPasswordSchema(t: Translate) {
  return z.object({ name: fullName(t), password: password(t) });
}

export function organizationSchema(t: Translate) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("common:validation.nameRequired"))
      .max(80, t("common:validation.nameTooLong")),
    slug: z
      .string()
      .trim()
      .min(2, t("common:validation.slugTooShort"))
      .max(40, t("common:validation.slugTooLong"))
      .regex(SLUG_PATTERN, t("common:validation.slugChars"))
      // The slug sits at the root of the site, next to the addresses absqir
      // serves itself, so the reserved ones are refused before the request.
      .refine((slug) => !isReservedSlug(slug), t("errors:slugReserved")),
  });
}

export type EmailValues = z.infer<ReturnType<typeof emailSchema>>;
export type PasswordValues = z.infer<ReturnType<typeof passwordSchema>>;
export type CodeValues = z.infer<ReturnType<typeof codeSchema>>;
export type ResetValues = z.infer<ReturnType<typeof resetSchema>>;
export type ProfileValues = z.infer<ReturnType<typeof profileSchema>>;
export type OrganizationValues = z.infer<ReturnType<typeof organizationSchema>>;
