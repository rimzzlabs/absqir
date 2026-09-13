import type { Translate } from "@absqir/i18n";
import { z } from "zod";

/** The roles an admin can hand out, in the order the select shows them. */
export const ROLE_OPTIONS = ["member", "organizer", "admin"] as const;

export type InvitableRole = (typeof ROLE_OPTIONS)[number];

const invitableRole = z.enum(ROLE_OPTIONS);

export function groupSchema(t: Translate) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("common:validation.nameRequired"))
      .max(80, t("common:validation.nameTooLong")),
    description: z.string().trim().max(500, t("common:validation.descriptionTooLong")),
  });
}

export function inviteSchema(t: Translate) {
  return z.object({
    email: z.email(t("common:validation.emailInvalid")),
    role: invitableRole,
  });
}

export function organizationSettingsSchema(t: Translate) {
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
      .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, t("common:validation.slugChars")),
  });
}

export type GroupValues = z.infer<ReturnType<typeof groupSchema>>;
export type InviteValues = z.infer<ReturnType<typeof inviteSchema>>;
export type OrganizationSettingsValues = z.infer<ReturnType<typeof organizationSettingsSchema>>;
