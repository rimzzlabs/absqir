import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isAfter,
  isSameDay,
} from "date-fns";

/** One format per intent. Callers pick an intent, never a pattern string. */
const PATTERNS = {
  date: "d MMM yyyy",
  dateTime: "d MMM yyyy, HH:mm",
  weekdayDateTime: "EEE d MMM, HH:mm",
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

/** "Mon 8 Sep, 09:00 to 10:00", or both ends in full when they fall on different days. */
export function formatRange(start: Date, end: Date): string {
  if (isSameDay(start, end)) {
    return `${formatDate(start, "weekdayDateTime")} to ${formatDate(end, "time")}`;
  }

  return `${formatDate(start, "weekdayDateTime")} to ${formatDate(end, "weekdayDateTime")}`;
}

/** Whole minutes between two instants, never negative. */
export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}
