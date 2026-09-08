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
    startsAt: z.date({ error: "Pick a start." }),
    endsAt: z.date({ error: "Pick an end." }),
    lateAfterMinutes: minutes(24 * 60),
    opensBeforeMinutes: minutes(24 * 60),
    allowWalkIns: z.boolean(),
    registrationOpen: z.boolean(),
    /** Empty means no limit. */
    registrationLimit: z
      .string()
      .trim()
      .regex(/^\d*$/, "Whole numbers only.")
      .refine((value) => value === "" || Number(value) >= 1, "At least 1."),
    groupIds: z.array(z.string()),
  })
  .refine((values) => values.endsAt > values.startsAt, {
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
    startsOn: z.date({ error: "Pick a date." }),
    endsOn: z.date().nullable(),
    active: z.boolean(),
    allowWalkIns: z.boolean(),
    groupIds: z.array(z.string()),
  })
  .refine((values) => values.frequency === "daily" || values.weekdays.length > 0, {
    message: "Pick at least one weekday.",
    path: ["weekdays"],
  })
  .refine((values) => values.endsOn === null || values.endsOn >= values.startsOn, {
    message: "The end must not come before the start.",
    path: ["endsOn"],
  });

export type SessionValues = z.infer<typeof sessionSchema>;
export type ScheduleValues = z.infer<typeof scheduleSchema>;
