import { z } from "zod";

export const createSessionSchema = z.object({
  title: z.string().min(1, "Enter a title.").max(120, "That title is too long."),
});

export const checkInSchema = z.object({
  name: z.string().min(1, "Enter your name.").max(120, "That name is too long."),
  identifier: z.string().min(1, "Enter your ID number.").max(60, "That ID is too long."),
});

export type CreateSessionValues = z.infer<typeof createSessionSchema>;
export type CheckInValues = z.infer<typeof checkInSchema>;
