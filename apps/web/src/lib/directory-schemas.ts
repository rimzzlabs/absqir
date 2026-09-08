import { z } from "zod";

export const ROLE_OPTIONS = [
  { value: "member", label: "Member", hint: "Sees their own sessions and history." },
  { value: "organizer", label: "Organizer", hint: "Runs sessions and scans at the door." },
  { value: "admin", label: "Admin", hint: "Manages people, groups, and settings." },
] as const;

export type InvitableRole = (typeof ROLE_OPTIONS)[number]["value"];

const invitableRole = z.enum(["member", "organizer", "admin"]);

const optionalEmail = z
  .string()
  .trim()
  .max(254, "That email is too long.")
  .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email.");

export const personSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120, "That name is too long."),
  email: optionalEmail,
  identifier: z.string().trim().max(60, "That identifier is too long."),
  invite: z.boolean(),
  role: invitableRole,
});

export const importSchema = z.object({
  csv: z.string().min(1, "Paste or upload a CSV."),
  invite: z.boolean(),
  role: invitableRole,
});

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80, "That name is too long."),
  description: z.string().trim().max(500, "Keep it under 500 characters."),
});

export const inviteSchema = z.object({
  email: z.email("Enter a valid email address."),
  role: invitableRole,
});

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80, "That name is too long."),
  slug: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(40, "Use at most 40 characters.")
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Lowercase letters, digits, and hyphens only."),
});

export type PersonValues = z.infer<typeof personSchema>;
export type ImportValues = z.infer<typeof importSchema>;
export type GroupValues = z.infer<typeof groupSchema>;
export type InviteValues = z.infer<typeof inviteSchema>;
export type OrganizationSettingsValues = z.infer<typeof organizationSettingsSchema>;
