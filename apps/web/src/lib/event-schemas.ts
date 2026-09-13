import type { Translate } from "@absqir/i18n";
import { z } from "zod";

/** Number inputs report strings; the mutation turns them into numbers. */
function minutes(t: Translate, max: number) {
  return z
    .string()
    .trim()
    .regex(/^\d+$/, t("events:validation.wholeMinutes"))
    .refine((value) => Number(value) <= max, t("events:validation.atMostMinutes", { count: max }));
}

function title(t: Translate) {
  return z
    .string()
    .trim()
    .min(1, t("events:validation.titleRequired"))
    .max(120, t("events:validation.titleTooLong"));
}

function notes(t: Translate) {
  return z.string().trim().max(1000, t("events:validation.notesTooLong"));
}

/** The form speaks local wall-clock; the mutation converts to ISO. */
export function eventSchema(t: Translate) {
  return z
    .object({
      title: title(t),
      description: notes(t),
      startsAt: z.date({ error: t("events:validation.pickStart") }),
      endsAt: z.date({ error: t("events:validation.pickEnd") }),
      lateAfterMinutes: minutes(t, 24 * 60),
      opensBeforeMinutes: minutes(t, 24 * 60),
      allowWalkIns: z.boolean(),
      registrationOpen: z.boolean(),
      /** Empty means no limit. */
      registrationLimit: z
        .string()
        .trim()
        .regex(/^\d*$/, t("events:validation.wholeNumbers"))
        .refine((value) => value === "" || Number(value) >= 1, t("events:validation.atLeastOne")),
      /** A saved place. Empty means none. */
      locationId: z.string(),
      requireLocation: z.boolean(),
      groupIds: z.array(z.string()),
    })
    .refine((values) => values.endsAt > values.startsAt, {
      message: t("events:validation.endAfterStart"),
      path: ["endsAt"],
    });
}

export function scheduleSchema(t: Translate) {
  return z
    .object({
      title: title(t),
      description: notes(t),
      frequency: z.enum(["daily", "weekly"]),
      weekdays: z.array(z.number().int().min(0).max(6)),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, t("events:validation.pickTime")),
      durationMinutes: minutes(t, 24 * 60).refine(
        (value) => Number(value) >= 5,
        t("events:validation.atLeastFiveMinutes"),
      ),
      lateAfterMinutes: minutes(t, 24 * 60),
      opensBeforeMinutes: minutes(t, 24 * 60),
      startsOn: z.date({ error: t("events:validation.pickDate") }),
      endsOn: z.date().nullable(),
      active: z.boolean(),
      allowWalkIns: z.boolean(),
      locationId: z.string(),
      requireLocation: z.boolean(),
      groupIds: z.array(z.string()),
    })
    .refine((values) => values.frequency === "daily" || values.weekdays.length > 0, {
      message: t("events:validation.pickWeekday"),
      path: ["weekdays"],
    })
    .refine((values) => values.endsOn === null || values.endsOn >= values.startsOn, {
      message: t("events:validation.endNotBeforeStart"),
      path: ["endsOn"],
    });
}

export type EventValues = z.infer<ReturnType<typeof eventSchema>>;
export type ScheduleValues = z.infer<ReturnType<typeof scheduleSchema>>;
