import { differenceInCalendarDays, format, formatDistanceToNowStrict, isAfter } from "date-fns";

/** One format per intent. Callers pick an intent, never a pattern string. */
const PATTERNS = {
  date: "d MMM yyyy",
  dateTime: "d MMM yyyy, HH:mm",
  time: "HH:mm",
  iso: "yyyy-MM-dd",
} as const;

export type DateIntent = keyof typeof PATTERNS;

export function formatDate(value: Date, intent: DateIntent = "date"): string {
  return format(value, PATTERNS[intent]);
}

export function relativeToNow(value: Date): string {
  return formatDistanceToNowStrict(value, { addSuffix: true });
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return isAfter(now, expiresAt);
}

export function daysUntil(target: Date, now: Date = new Date()): number {
  return differenceInCalendarDays(target, now);
}
