import { z } from "zod";

export const askLeaveSchema = z.object({
  eventId: z.string().min(1, "Pick an event."),
  reason: z.string().trim().min(1, "Give a reason.").max(500, "Keep it under 500 characters."),
});

export const decideLeaveSchema = z.object({
  note: z.string().trim().max(500, "Keep it under 500 characters."),
});

export type AskLeaveValues = z.infer<typeof askLeaveSchema>;
export type DecideLeaveValues = z.infer<typeof decideLeaveSchema>;
