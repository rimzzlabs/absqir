import type { Translate } from "@absqir/i18n";
import { z } from "zod";

export function askLeaveSchema(t: Translate) {
  return z.object({
    eventId: z.string().min(1, t("my:leave.validation.pickEvent")),
    reason: z
      .string()
      .trim()
      .min(1, t("my:leave.validation.reasonRequired"))
      .max(500, t("my:leave.validation.tooLong")),
  });
}

export function decideLeaveSchema(t: Translate) {
  return z.object({
    note: z.string().trim().max(500, t("my:leave.validation.tooLong")),
  });
}

export type AskLeaveValues = z.infer<ReturnType<typeof askLeaveSchema>>;
export type DecideLeaveValues = z.infer<ReturnType<typeof decideLeaveSchema>>;
