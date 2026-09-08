import { z } from "zod";

/** Number inputs report strings; the mutation turns them into numbers. */
const minutes = (max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Whole minutes only.")
    .refine((value) => Number(value) <= max, `At most ${max} minutes.`);

/** The form speaks local wall-clock; the mutation converts to ISO. */
export const sessionSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title.").max(120, "That title is too long."),
    description: z.string().trim().max(1000, "Keep it under 1000 characters."),
    startsAt: z.string().min(1, "Pick a start."),
    endsAt: z.string().min(1, "Pick an end."),
    lateAfterMinutes: minutes(24 * 60),
    opensBeforeMinutes: minutes(24 * 60),
    allowWalkIns: z.boolean(),
    groupIds: z.array(z.string()),
  })
  .refine((values) => new Date(values.endsAt) > new Date(values.startsAt), {
    message: "The end must come after the start.",
    path: ["endsAt"],
  });

export const scheduleSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title.").max(120, "That title is too long."),
    description: z.string().trim().max(1000, "Keep it under 1000 characters."),
    frequency: z.enum(["daily", "weekly"]),
    weekdays: z.array(z.number().int().min(0).max(6)),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time."),
    durationMinutes: minutes(24 * 60).refine((value) => Number(value) >= 5, "At least 5 minutes."),
    lateAfterMinutes: minutes(24 * 60),
    opensBeforeMinutes: minutes(24 * 60),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    endsOn: z.string(),
    active: z.boolean(),
    allowWalkIns: z.boolean(),
    groupIds: z.array(z.string()),
  })
  .refine((values) => values.frequency === "daily" || values.weekdays.length > 0, {
    message: "Pick at least one weekday.",
    path: ["weekdays"],
  });

export type SessionValues = z.infer<typeof sessionSchema>;
export type ScheduleValues = z.infer<typeof scheduleSchema>;

/** "2026-09-08T09:00" as typed into a datetime-local input, in the browser's zone. */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
