import type { Translate } from "@absqir/i18n";
import { z } from "zod";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth-schemas";

/** The same rule in both password forms, worded for the reader. */
function password(t: Translate) {
  return z
    .string()
    .min(MIN_PASSWORD_LENGTH, t("auth:validation.passwordShort", { count: MIN_PASSWORD_LENGTH }))
    .max(MAX_PASSWORD_LENGTH, t("auth:validation.passwordLong"));
}

export function nameSchema(t: Translate) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("auth:validation.nameRequired"))
      .max(80, t("common:validation.nameTooLong")),
  });
}

export function newEmailSchema(t: Translate) {
  return z.object({
    email: z.email(t("common:validation.emailInvalid")),
  });
}

export function changePasswordSchema(t: Translate) {
  return z.object({
    currentPassword: z.string().min(1, t("account:validation.currentPasswordRequired")),
    newPassword: password(t),
    signOutOthers: z.boolean(),
  });
}

export function setPasswordSchema(t: Translate) {
  return z.object({ password: password(t) });
}

export type NameValues = z.infer<ReturnType<typeof nameSchema>>;
export type SetPasswordValues = z.infer<ReturnType<typeof setPasswordSchema>>;
export type NewEmailValues = z.infer<ReturnType<typeof newEmailSchema>>;
export type ChangePasswordValues = z.infer<ReturnType<typeof changePasswordSchema>>;
