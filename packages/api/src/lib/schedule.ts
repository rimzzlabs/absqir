import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { TZDate } from "@date-fns/tz";
import { A, pipe } from "@mobily/ts-belt";
import { addDays, addMinutes, isAfter, isBefore, startOfDay } from "date-fns";
import { and, eq, gte, inArray } from "drizzle-orm";

const { schedule, scheduleGroup, attendanceSession, sessionGroup } = schema;

/** How far ahead a schedule spawns sessions. */
export const HORIZON_DAYS = 14;

type ScheduleRow = typeof schedule.$inferSelect;

function parseClock(value: string): { hours: number; minutes: number } {
  const [h, m] = A.map(value.split(":"), Number);
  return { hours: h ?? 0, minutes: m ?? 0 };
}

function parseDate(value: string, timezone: string): TZDate {
  const [y, mo, d] = A.map(value.split("-"), Number);
  return new TZDate(y ?? 1970, (mo ?? 1) - 1, d ?? 1, timezone);
}

/**
 * Every instant this schedule starts between two moments, in the schedule's
 * own timezone, so 09:00 stays 09:00 across a daylight saving change.
 */
export function occurrencesBetween(rule: ScheduleRow, from: Date, until: Date): Date[] {
  const { hours, minutes } = parseClock(rule.startTime);
  const first = parseDate(rule.startsOn, rule.timezone);
  const last = rule.endsOn ? parseDate(rule.endsOn, rule.timezone) : null;
  const weekdays = new Set(rule.weekdays);

  let day = startOfDay(new TZDate(from, rule.timezone));
  if (isBefore(day, first)) day = first;

  const out: Date[] = [];

  while (!isAfter(day, until)) {
    if (last && isAfter(day, last)) break;

    const matches = rule.frequency === "daily" || weekdays.has(day.getDay());

    if (matches) {
      const start = new TZDate(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hours,
        minutes,
        rule.timezone,
      );

      if (!isBefore(start, from) && !isAfter(start, until)) {
        out.push(new Date(start.getTime()));
      }
    }

    day = addDays(day, 1);
  }

  return out;
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return A.map([...bytes], (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Creates the sessions every active schedule of an organization owes for
 * the next HORIZON_DAYS. Idempotent: the unique index on (schedule, start)
 * stops a repeat. Called when sessions are listed, so no cron is needed
 * for the schedule to keep up; a cron in a later phase only makes it eager.
 */
export async function materializeSchedules(
  db: Database,
  organizationId: string,
  now: Date = new Date(),
): Promise<number> {
  const rules = await db
    .select()
    .from(schedule)
    .where(and(eq(schedule.organizationId, organizationId), eq(schedule.active, true)));

  if (rules.length === 0) return 0;

  const until = addDays(now, HORIZON_DAYS);
  const ruleIds = A.map(rules, (rule) => rule.id);

  const [existing, groups] = await Promise.all([
    db
      .select({ scheduleId: attendanceSession.scheduleId, startsAt: attendanceSession.startsAt })
      .from(attendanceSession)
      .where(
        and(inArray(attendanceSession.scheduleId, ruleIds), gte(attendanceSession.startsAt, now)),
      ),
    db
      .select({ scheduleId: scheduleGroup.scheduleId, groupId: scheduleGroup.groupId })
      .from(scheduleGroup)
      .where(inArray(scheduleGroup.scheduleId, ruleIds)),
  ]);

  const seen = new Set(A.map(existing, (row) => `${row.scheduleId}:${row.startsAt.getTime()}`));
  let created = 0;

  for (const rule of rules) {
    const groupIds = pipe(
      groups,
      A.filter((row) => row.scheduleId === rule.id),
      A.map((row) => row.groupId),
    );

    for (const startsAt of occurrencesBetween(rule, now, until)) {
      if (seen.has(`${rule.id}:${startsAt.getTime()}`)) continue;

      const id = crypto.randomUUID();

      await db.transaction(async (tx) => {
        await tx
          .insert(attendanceSession)
          .values({
            id,
            organizationId,
            scheduleId: rule.id,
            title: rule.title,
            description: rule.description,
            startsAt,
            endsAt: addMinutes(startsAt, rule.durationMinutes),
            lateAfterMinutes: rule.lateAfterMinutes,
            opensBeforeMinutes: rule.opensBeforeMinutes,
            allowWalkIns: rule.allowWalkIns,
            secret: randomSecret(),
          })
          .onConflictDoNothing();

        if (groupIds.length) {
          await tx
            .insert(sessionGroup)
            .values([...A.map(groupIds, (groupId) => ({ sessionId: id, groupId }))])
            .onConflictDoNothing();
        }
      });

      created += 1;
    }
  }

  return created;
}

export { randomSecret };
