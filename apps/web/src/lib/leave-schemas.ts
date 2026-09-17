import type { Translate } from "@absqir/i18n";
import { z } from "zod";

/** How long a reason or a decision note may be. The counter reads it too. */
export const REASON_LIMIT = 500;

export function askLeaveSchema(t: Translate) {
  return z.object({
    eventId: z.string().min(1, t("my:leave.validation.pickEvent")),
    reason: z
      .string()
      .trim()
      .min(1, t("my:leave.validation.reasonRequired"))
      .max(REASON_LIMIT, t("my:leave.validation.tooLong")),
  });
}

export function decideLeaveSchema(t: Translate) {
  return z.object({
    note: z.string().trim().max(REASON_LIMIT, t("my:leave.validation.tooLong")),
  });
}

export type AskLeaveValues = z.infer<ReturnType<typeof askLeaveSchema>>;
export type DecideLeaveValues = z.infer<ReturnType<typeof decideLeaveSchema>>;
