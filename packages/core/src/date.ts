import { TZDate } from "@date-fns/tz";
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isAfter,
  isSameDay,
} from "date-fns";
import { match, P } from "ts-pattern";

/** One format per intent. Callers pick an intent, never a pattern string. */
const PATTERNS = {
  date: "d MMM yyyy",
  dateTime: "d MMM yyyy, HH:mm",
  weekdayDateTime: "EEE d MMM, HH:mm",
  /** "September 2026", for a calendar header. */
  monthYear: "MMMM yyyy",
  /** "8 Sep", for one end of a week label. */
  dayMonth: "d MMM",
  /** "Mon 8 Sep", for a day heading. */
  weekdayDate: "EEE d MMM",
  /** "8", for the big number in an agenda. */
  dayOfMonth: "d",
  /** "Mon", beside the day number. */
  weekday: "EEE",
  time: "HH:mm",
  iso: "yyyy-MM-dd",
} as const;

export type DateIntent = keyof typeof PATTERNS;

type TimezoneResolver = () => string | null;

/**
 * Where the display zone comes from. The web app installs a resolver that
 * reads the account's zone off the page; nothing is installed on the server,
 * so it formats in the runtime's own zone as before. Module state, because
 * every date on every page goes through formatDate and threading a zone
 * through each call would touch every screen.
 */
let resolveTimezone: TimezoneResolver = () => null;

export function setDisplayTimezoneResolver(resolver: TimezoneResolver): void {
  resolveTimezone = resolver;
}

/** The zone dates are shown in, or null for the device's own. */
export function displayTimezone(): string | null {
  return resolveTimezone();
}

/**
 * The same instant, read in the display zone. date-fns keeps the zone
 * through startOfDay, addDays and the rest, so calendar arithmetic that
 * starts here stays in it.
 */
export function inDisplayZone(value: Date): Date {
  const zone = resolveTimezone();
  return match(zone)
    .with(P.string.minLength(1), (zone) => new TZDate(value, zone))
    .otherwise(() => value);
}

/** Now, in the display zone. */
export function nowInDisplayZone(): Date {
  return inDisplayZone(new Date());
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Midnight of a "yyyy-MM-dd" day in the display zone, or null for anything else. */
export function parseDisplayDay(value: string): Date | null {
  const parts = ISO_DAY.exec(value);
  if (!parts) return null;

  const year = Number(parts[1]);
  const month = Number(parts[2]) - 1;
  const day = Number(parts[3]);
  const zone = resolveTimezone();
  const date = match(zone)
    .with(P.string.minLength(1), (zone) => new TZDate(year, month, day, zone))
    .otherwise(() => new Date(year, month, day));

  // A 40th of a month rolls over instead of failing; the round trip catches it.
  return match(Number.isNaN(date.getTime()) || format(date, PATTERNS.iso) !== value)
    .with(true, () => null)
    .otherwise(() => date);
}

export function formatDate(value: Date, intent: DateIntent = "date"): string {
  return format(inDisplayZone(value), PATTERNS[intent]);
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
  if (isSameDay(inDisplayZone(start), inDisplayZone(end))) {
    return `${formatDate(start, "weekdayDateTime")} to ${formatDate(end, "time")}`;
  }

  return `${formatDate(start, "weekdayDateTime")} to ${formatDate(end, "weekdayDateTime")}`;
}

/** Whole minutes between two instants, never negative. */
export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/**
 * The calendar arithmetic the app needs, from one place. Only `@absqir/core`
 * depends on date-fns, so a page never reaches past its own dependencies.
 */
export {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
