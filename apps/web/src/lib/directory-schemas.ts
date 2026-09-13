import { z } from "zod";

export const ROLE_OPTIONS = [
  { value: "member", label: "Member", hint: "Sees their own events and history." },
  { value: "organizer", label: "Organizer", hint: "Runs events and scans at the door." },
  { value: "admin", label: "Admin", hint: "Manages people, groups, and settings." },
] as const;

export type InvitableRole = (typeof ROLE_OPTIONS)[number]["value"];

const invitableRole = z.enum(["member", "organizer", "admin"]);

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

export type GroupValues = z.infer<typeof groupSchema>;
export type InviteValues = z.infer<typeof inviteSchema>;
export type OrganizationSettingsValues = z.infer<typeof organizationSettingsSchema>;
