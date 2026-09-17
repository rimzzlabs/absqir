import { match } from "ts-pattern";

/**
 * How far back a member reads their own record. The window counts back from
 * now, because a member asks for "the last three months", never "the third
 * quarter of the year".
 */
export const HISTORY_WINDOWS = ["any", "30d", "90d", "12m"] as const;

export type HistoryWindow = (typeof HISTORY_WINDOWS)[number];

const DAY = 86_400_000;

/** The first instant a window takes in, or null when it takes in everything. */
export function historySince(when: HistoryWindow, now: Date): Date | null {
  return match(when)
    .with("any", () => null)
    .with("30d", () => new Date(now.getTime() - 30 * DAY))
    .with("90d", () => new Date(now.getTime() - 90 * DAY))
    .with("12m", () => new Date(now.getTime() - 365 * DAY))
    .exhaustive();
}
