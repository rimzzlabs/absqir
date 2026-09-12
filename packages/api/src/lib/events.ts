import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import type { AttendanceStatus } from "@absqir/db/schema";
import { A } from "@mobily/ts-belt";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { match } from "ts-pattern";
import { decodeCursor, pageOf } from "#src/lib/cursor";
import { type EventStatus, isBackfill, needsFinalising, statusOf } from "#src/lib/event-status";
import { type EventRow, expectedPersonIds, registeredPersonIds } from "#src/lib/expected";
import { notifyDueReminders, notifyEventClosed } from "#src/lib/notify";
import { materializeSchedules } from "#src/lib/schedule";

const {
  event: eventTable,
  eventGroup,
  eventRegistration,
  group,
  groupMember,
  person,
  attendanceRecord,
} = schema;

export type RecordRow = typeof attendanceRecord.$inferSelect;

export { type EventRow, expectedPersonIds, registeredPersonIds };

export interface EventCounts {
  expected: number;
  registered: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
}

export interface EventJson {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  lateAfterMinutes: number;
  opensBeforeMinutes: number;
  allowWalkIns: boolean;
  registrationOpen: boolean;
  registrationLimit: number | null;
  registrationCount: number;
  openedAt: string | null;
  closedAt: string | null;
  scheduleId: string | null;
  status: EventStatus;
  groups: { id: string; name: string }[];
  counts: EventCounts;
}

const EMPTY_COUNTS: EventCounts = {
  expected: 0,
  registered: 0,
  present: 0,
  late: 0,
  excused: 0,
  absent: 0,
};

export async function findEvent(db: Database, organizationId: string, id: string) {
  const rows = await db
    .select()
    .from(eventTable)
    .where(and(eq(eventTable.id, id), eq(eventTable.organizationId, organizationId)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Writes the absent rows for everyone expected who never checked in, and
 * stamps closedAt. Idempotent. `at` is the close instant: the end time when
 * the clock closed it, now when an organizer did.
 */
export async function finalizeEvent(db: Database, event: EventRow, at: Date): Promise<void> {
  const expected = await expectedPersonIds(db, event.id);

  const closed = await db.transaction(async (tx) => {
    if (expected.length) {
      await tx
        .insert(attendanceRecord)
        .values([
          ...A.map(expected, (personId) => ({
            id: crypto.randomUUID(),
            eventId: event.id,
            personId,
            status: "absent" as const,
            method: "auto" as const,
          })),
        ])
        .onConflictDoNothing({ target: [attendanceRecord.eventId, attendanceRecord.personId] });
    }

    return tx
      .update(eventTable)
      .set({ closedAt: at, updatedAt: new Date() })
      .where(and(eq(eventTable.id, event.id), isNull(eventTable.closedAt)))
      .returning({ id: eventTable.id });
  });

  // Only the close that wins the race tells the organizers, and an event
  // that was already over when somebody wrote it tells nobody.
  if (closed.length === 0 || isBackfill(event)) return;

  const rows = await db
    .select({ status: attendanceRecord.status, value: sql<number>`count(*)`.mapWith(Number) })
    .from(attendanceRecord)
    .where(eq(attendanceRecord.eventId, event.id))
    .groupBy(attendanceRecord.status);

  const counts = { present: 0, late: 0, excused: 0, absent: 0 };
  for (const row of rows) counts[row.status] = row.value;

  await notifyEventClosed(db, event, counts);
}

/** Closes every event of the organization the clock has ended. */
export async function finalizeDueEvents(
  db: Database,
  organizationId: string,
  now: Date = new Date(),
): Promise<void> {
  const due = await db
    .select()
    .from(eventTable)
    .where(
      and(
        eq(eventTable.organizationId, organizationId),
        isNull(eventTable.closedAt),
        lte(eventTable.endsAt, now),
      ),
    );

  for (const event of due) {
    if (needsFinalising(event, now)) await finalizeEvent(db, event, event.endsAt);
  }
}

/**
 * Keeps the organization's events honest before any read, and sends the
 * reminders that fell due. A deployment without a cron still notifies,
 * because somebody reads a page far more often than an event starts.
 */
export async function settle(db: Database, organizationId: string, now: Date = new Date()) {
  await materializeSchedules(db, organizationId, now);
  await finalizeDueEvents(db, organizationId, now);

  try {
    await notifyDueReminders(db, organizationId, now);
  } catch (error) {
    // A reminder is never worth failing the page the reader asked for.
    console.error({ message: "reminders failed", organizationId, error });
  }
}

async function groupsByEvent(db: Database, eventIds: readonly string[]) {
  if (eventIds.length === 0) return new Map<string, { id: string; name: string }[]>();

  const rows = await db
    .select({ eventId: eventGroup.eventId, id: group.id, name: group.name })
    .from(eventGroup)
    .innerJoin(group, eq(group.id, eventGroup.groupId))
    .where(inArray(eventGroup.eventId, eventIds))
    .orderBy(asc(group.name));

  const map = new Map<string, { id: string; name: string }[]>();
  for (const row of rows) {
    const list = map.get(row.eventId) ?? [];
    list.push({ id: row.id, name: row.name });
    map.set(row.eventId, list);
  }

  return map;
}

async function countsByEvent(db: Database, eventIds: readonly string[]) {
  const map = new Map<string, EventCounts>();
  if (eventIds.length === 0) return map;

  const [fromGroups, registrations, records] = await Promise.all([
    db
      .select({ eventId: eventGroup.eventId, personId: groupMember.personId })
      .from(eventGroup)
      .innerJoin(groupMember, eq(groupMember.groupId, eventGroup.groupId))
      .where(inArray(eventGroup.eventId, eventIds)),
    db
      .select({ eventId: eventRegistration.eventId, personId: eventRegistration.personId })
      .from(eventRegistration)
      .where(inArray(eventRegistration.eventId, eventIds)),
    db
      .select({
        eventId: attendanceRecord.eventId,
        status: attendanceRecord.status,
        value: sql<number>`count(*)`.mapWith(Number),
      })
      .from(attendanceRecord)
      .where(inArray(attendanceRecord.eventId, eventIds))
      .groupBy(attendanceRecord.eventId, attendanceRecord.status),
  ]);

  for (const id of eventIds) map.set(id, { ...EMPTY_COUNTS });

  const expectedSets = new Map<string, Set<string>>();
  for (const row of [...fromGroups, ...registrations]) {
    const set = expectedSets.get(row.eventId) ?? new Set<string>();
    set.add(row.personId);
    expectedSets.set(row.eventId, set);
  }
  for (const [id, set] of expectedSets) {
    const counts = map.get(id);
    if (counts) counts.expected = set.size;
  }
  for (const row of registrations) {
    const counts = map.get(row.eventId);
    if (counts) counts.registered += 1;
  }
  for (const row of records) {
    const counts = map.get(row.eventId);
    if (counts) counts[row.status] = row.value;
  }

  return map;
}

export async function toEventJson(
  db: Database,
  rows: readonly EventRow[],
  now: Date = new Date(),
): Promise<readonly EventJson[]> {
  const ids = A.map(rows, (row) => row.id);
  const [groups, counts] = await Promise.all([groupsByEvent(db, ids), countsByEvent(db, ids)]);

  return A.map(rows, (row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    lateAfterMinutes: row.lateAfterMinutes,
    opensBeforeMinutes: row.opensBeforeMinutes,
    allowWalkIns: row.allowWalkIns,
    registrationOpen: row.registrationOpen,
    registrationLimit: row.registrationLimit ?? null,
    registrationCount: counts.get(row.id)?.registered ?? 0,
    openedAt: row.openedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    scheduleId: row.scheduleId ?? null,
    status: statusOf(row, now),
    groups: groups.get(row.id) ?? [],
    counts: counts.get(row.id) ?? { ...EMPTY_COUNTS },
  }));
}

export type EventScope = "upcoming" | "past" | "all";

export interface ListEventsParams {
  organizationId: string;
  scope: EventScope;
  /** A piece of the title, any case. */
  q?: string;
  /** Only events that expect this group. */
  groupId?: string;
  /** Only events that expect this person, through a group or a registration. */
  expectedPersonId?: string;
  /** Where the previous page ended, from the previous answer. */
  cursor?: string;
  limit: number;
  now?: Date;
}

/** The events one person is expected at: in one of their groups, or registered. */
function expects(db: Database, personId: string) {
  return or(
    inArray(
      eventTable.id,
      db
        .select({ id: eventGroup.eventId })
        .from(eventGroup)
        .innerJoin(groupMember, eq(groupMember.groupId, eventGroup.groupId))
        .where(eq(groupMember.personId, personId)),
    ),
    inArray(
      eventTable.id,
      db
        .select({ id: eventRegistration.eventId })
        .from(eventRegistration)
        .where(eq(eventRegistration.personId, personId)),
    ),
  );
}

/** An event belongs to the past once it closed, by hand or by the clock. */
export function isPast(now: Date) {
  return or(isNotNull(eventTable.closedAt), lt(eventTable.endsAt, now));
}

/**
 * One page of events. Upcoming ones run soonest first, the others newest
 * first, and the page walks the (starts_at, id) index instead of an offset,
 * so page fifty costs what page one does.
 */
export async function listEvents(db: Database, params: ListEventsParams) {
  const now = params.now ?? new Date();
  const ascending = params.scope === "upcoming";
  const cursor = decodeCursor(params.cursor);
  const startsAtText = sql<string>`${eventTable.startsAt}::text`;

  const after = cursor
    ? or(
        (ascending ? gt : lt)(eventTable.startsAt, sql`${cursor.at}::timestamptz`),
        and(
          eq(eventTable.startsAt, sql`${cursor.at}::timestamptz`),
          (ascending ? gt : lt)(eventTable.id, cursor.id),
        ),
      )
    : undefined;

  const needle = params.q ? `%${params.q.replaceAll(/[%_\\]/g, "\\$&")}%` : null;

  const rows = await db
    .select({ row: eventTable, at: startsAtText })
    .from(eventTable)
    .where(
      and(
        eq(eventTable.organizationId, params.organizationId),
        match(params.scope)
          .with("upcoming", () => and(isNull(eventTable.closedAt), gte(eventTable.endsAt, now)))
          .with("past", () => isPast(now))
          .with("all", () => undefined)
          .exhaustive(),
        needle ? ilike(eventTable.title, needle) : undefined,
        params.groupId
          ? inArray(
              eventTable.id,
              db
                .select({ id: eventGroup.eventId })
                .from(eventGroup)
                .where(eq(eventGroup.groupId, params.groupId)),
            )
          : undefined,
        params.expectedPersonId ? expects(db, params.expectedPersonId) : undefined,
        after,
      ),
    )
    .orderBy(
      ...(ascending
        ? [asc(eventTable.startsAt), asc(eventTable.id)]
        : [desc(eventTable.startsAt), desc(eventTable.id)]),
    )
    .limit(params.limit + 1);

  const page = pageOf(rows, params.limit, (entry) => ({ at: entry.at, id: entry.row.id }));

  return { items: A.map(page.items, (entry) => entry.row), nextCursor: page.nextCursor };
}

export interface RecordJson {
  personId: string;
  name: string;
  email: string | null;
  identifier: string | null;
  /** In one of the event's groups, or registered. A walk-in is neither. */
  expected: boolean;
  /** Came through the public registration page. */
  registered: boolean;
  status: AttendanceStatus | null;
  method: string | null;
  checkedInAt: string | null;
  note: string | null;
}

/** Everyone expected, plus anyone with a record, with what the record says. */
export async function eventRecords(db: Database, eventId: string): Promise<readonly RecordJson[]> {
  const [expected, registered, records] = await Promise.all([
    expectedPersonIds(db, eventId),
    registeredPersonIds(db, eventId),
    db.select().from(attendanceRecord).where(eq(attendanceRecord.eventId, eventId)),
  ]);

  const expectedSet = new Set(expected);
  const registeredSet = new Set(registered);
  const ids = [...new Set([...expected, ...A.map(records, (row) => row.personId)])];
  if (ids.length === 0) return [];

  const people = await db
    .select({
      id: person.id,
      name: person.name,
      email: person.email,
      identifier: person.identifier,
    })
    .from(person)
    .where(inArray(person.id, ids))
    .orderBy(asc(sql`lower(${person.name})`));

  const byPerson = new Map(A.map(records, (row) => [row.personId, row]));

  return A.map(people, (row) => {
    const record = byPerson.get(row.id);

    return {
      personId: row.id,
      name: row.name,
      email: row.email ?? null,
      identifier: row.identifier ?? null,
      expected: expectedSet.has(row.id),
      registered: registeredSet.has(row.id),
      status: record?.status ?? null,
      method: record?.method ?? null,
      checkedInAt: record?.checkedInAt?.toISOString() ?? null,
      note: record?.note ?? null,
    };
  });
}

export interface UpsertRecordParams {
  eventId: string;
  personId: string;
  status: AttendanceStatus;
  method: RecordRow["method"];
  checkedInAt: Date | null;
  note?: string | null;
  markedBy?: string | null;
}

/** One row per person per event; a later write replaces the earlier one. */
export async function upsertRecord(db: Database, params: UpsertRecordParams): Promise<RecordRow> {
  const [row] = await db
    .insert(attendanceRecord)
    .values({
      id: crypto.randomUUID(),
      eventId: params.eventId,
      personId: params.personId,
      status: params.status,
      method: params.method,
      checkedInAt: params.checkedInAt,
      note: params.note ?? null,
      markedBy: params.markedBy ?? null,
    })
    .onConflictDoUpdate({
      target: [attendanceRecord.eventId, attendanceRecord.personId],
      set: {
        status: params.status,
        method: params.method,
        checkedInAt: params.checkedInAt,
        note: params.note ?? null,
        markedBy: params.markedBy ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) throw new Error("Upsert returned no row");

  return row;
}

export async function existingRecord(db: Database, eventId: string, personId: string) {
  const rows = await db
    .select()
    .from(attendanceRecord)
    .where(and(eq(attendanceRecord.eventId, eventId), eq(attendanceRecord.personId, personId)))
    .limit(1);

  return rows[0] ?? null;
}

/** The directory row behind an account in one organization. */
export async function personForUser(db: Database, organizationId: string, userId: string) {
  const rows = await db
    .select()
    .from(person)
    .where(and(eq(person.organizationId, organizationId), eq(person.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function isExpected(db: Database, eventId: string, personId: string) {
  const [inGroup, registered] = await Promise.all([
    db
      .select({ personId: groupMember.personId })
      .from(eventGroup)
      .innerJoin(groupMember, eq(groupMember.groupId, eventGroup.groupId))
      .where(and(eq(eventGroup.eventId, eventId), eq(groupMember.personId, personId)))
      .limit(1),
    db
      .select({ personId: eventRegistration.personId })
      .from(eventRegistration)
      .where(and(eq(eventRegistration.eventId, eventId), eq(eventRegistration.personId, personId)))
      .limit(1),
  ]);

  return inGroup.length > 0 || registered.length > 0;
}
