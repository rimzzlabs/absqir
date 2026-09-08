import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import type { AttendanceStatus } from "@absqir/db/schema";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { expectedPersonIds, registeredPersonIds, type SessionRow } from "@/lib/expected";
import { notifyDueReminders, notifySessionClosed } from "@/lib/notify";
import { materializeSchedules } from "@/lib/schedule";
import { needsFinalising, type SessionStatus, statusOf } from "@/lib/session-status";

const {
  attendanceSession,
  sessionGroup,
  sessionRegistration,
  group,
  groupMember,
  person,
  attendanceRecord,
} = schema;

export type RecordRow = typeof attendanceRecord.$inferSelect;

export { expectedPersonIds, registeredPersonIds, type SessionRow };

export interface SessionCounts {
  expected: number;
  registered: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
}

export interface SessionJson {
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
  status: SessionStatus;
  groups: { id: string; name: string }[];
  counts: SessionCounts;
}

const EMPTY_COUNTS: SessionCounts = {
  expected: 0,
  registered: 0,
  present: 0,
  late: 0,
  excused: 0,
  absent: 0,
};

export async function findSession(db: Database, organizationId: string, id: string) {
  const rows = await db
    .select()
    .from(attendanceSession)
    .where(and(eq(attendanceSession.id, id), eq(attendanceSession.organizationId, organizationId)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Writes the absent rows for everyone expected who never checked in, and
 * stamps closedAt. Idempotent. `at` is the close instant: the end time when
 * the clock closed it, now when an organizer did.
 */
export async function finalizeSession(db: Database, session: SessionRow, at: Date): Promise<void> {
  const expected = await expectedPersonIds(db, session.id);

  const closed = await db.transaction(async (tx) => {
    if (expected.length) {
      await tx
        .insert(attendanceRecord)
        .values(
          expected.map((personId) => ({
            id: crypto.randomUUID(),
            sessionId: session.id,
            personId,
            status: "absent" as const,
            method: "auto" as const,
          })),
        )
        .onConflictDoNothing({ target: [attendanceRecord.sessionId, attendanceRecord.personId] });
    }

    return tx
      .update(attendanceSession)
      .set({ closedAt: at, updatedAt: new Date() })
      .where(and(eq(attendanceSession.id, session.id), isNull(attendanceSession.closedAt)))
      .returning({ id: attendanceSession.id });
  });

  // Only the close that wins the race tells the organizers.
  if (closed.length === 0) return;

  const rows = await db
    .select({ status: attendanceRecord.status, value: sql<number>`count(*)`.mapWith(Number) })
    .from(attendanceRecord)
    .where(eq(attendanceRecord.sessionId, session.id))
    .groupBy(attendanceRecord.status);

  const counts = { present: 0, late: 0, excused: 0, absent: 0 };
  for (const row of rows) counts[row.status] = row.value;

  await notifySessionClosed(db, session, counts);
}

/** Closes every session of the organization the clock has ended. */
export async function finalizeDueSessions(
  db: Database,
  organizationId: string,
  now: Date = new Date(),
): Promise<void> {
  const due = await db
    .select()
    .from(attendanceSession)
    .where(
      and(
        eq(attendanceSession.organizationId, organizationId),
        isNull(attendanceSession.closedAt),
        lte(attendanceSession.endsAt, now),
      ),
    );

  for (const session of due) {
    if (needsFinalising(session, now)) await finalizeSession(db, session, session.endsAt);
  }
}

/**
 * Keeps the organization's sessions honest before any read, and sends the
 * reminders that fell due. A deployment without a cron still notifies,
 * because somebody reads a page far more often than a session starts.
 */
export async function settle(db: Database, organizationId: string, now: Date = new Date()) {
  await materializeSchedules(db, organizationId, now);
  await finalizeDueSessions(db, organizationId, now);

  try {
    await notifyDueReminders(db, organizationId, now);
  } catch (error) {
    // A reminder is never worth failing the page the reader asked for.
    console.error({ message: "reminders failed", organizationId, error });
  }
}

async function groupsBySession(db: Database, sessionIds: string[]) {
  if (sessionIds.length === 0) return new Map<string, { id: string; name: string }[]>();

  const rows = await db
    .select({ sessionId: sessionGroup.sessionId, id: group.id, name: group.name })
    .from(sessionGroup)
    .innerJoin(group, eq(group.id, sessionGroup.groupId))
    .where(inArray(sessionGroup.sessionId, sessionIds))
    .orderBy(asc(group.name));

  const map = new Map<string, { id: string; name: string }[]>();
  for (const row of rows) {
    const list = map.get(row.sessionId) ?? [];
    list.push({ id: row.id, name: row.name });
    map.set(row.sessionId, list);
  }

  return map;
}

async function countsBySession(db: Database, sessionIds: string[]) {
  const map = new Map<string, SessionCounts>();
  if (sessionIds.length === 0) return map;

  const [fromGroups, registrations, records] = await Promise.all([
    db
      .select({ sessionId: sessionGroup.sessionId, personId: groupMember.personId })
      .from(sessionGroup)
      .innerJoin(groupMember, eq(groupMember.groupId, sessionGroup.groupId))
      .where(inArray(sessionGroup.sessionId, sessionIds)),
    db
      .select({ sessionId: sessionRegistration.sessionId, personId: sessionRegistration.personId })
      .from(sessionRegistration)
      .where(inArray(sessionRegistration.sessionId, sessionIds)),
    db
      .select({
        sessionId: attendanceRecord.sessionId,
        status: attendanceRecord.status,
        value: sql<number>`count(*)`.mapWith(Number),
      })
      .from(attendanceRecord)
      .where(inArray(attendanceRecord.sessionId, sessionIds))
      .groupBy(attendanceRecord.sessionId, attendanceRecord.status),
  ]);

  for (const id of sessionIds) map.set(id, { ...EMPTY_COUNTS });

  const expectedSets = new Map<string, Set<string>>();
  for (const row of [...fromGroups, ...registrations]) {
    const set = expectedSets.get(row.sessionId) ?? new Set<string>();
    set.add(row.personId);
    expectedSets.set(row.sessionId, set);
  }
  for (const [id, set] of expectedSets) {
    const counts = map.get(id);
    if (counts) counts.expected = set.size;
  }
  for (const row of registrations) {
    const counts = map.get(row.sessionId);
    if (counts) counts.registered += 1;
  }
  for (const row of records) {
    const counts = map.get(row.sessionId);
    if (counts) counts[row.status] = row.value;
  }

  return map;
}

export async function toSessionJson(
  db: Database,
  rows: SessionRow[],
  now: Date = new Date(),
): Promise<SessionJson[]> {
  const ids = rows.map((row) => row.id);
  const [groups, counts] = await Promise.all([groupsBySession(db, ids), countsBySession(db, ids)]);

  return rows.map((row) => ({
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

export type SessionScope = "upcoming" | "past" | "all";

const PAST_LIMIT = 200;

/** A session belongs to the past once it closed, by hand or by the clock. */
export function isPast(now: Date) {
  return or(isNotNull(attendanceSession.closedAt), lt(attendanceSession.endsAt, now));
}

export async function listSessions(
  db: Database,
  organizationId: string,
  scope: SessionScope,
  now: Date = new Date(),
): Promise<SessionRow[]> {
  const base = eq(attendanceSession.organizationId, organizationId);

  if (scope === "upcoming") {
    return db
      .select()
      .from(attendanceSession)
      .where(and(base, isNull(attendanceSession.closedAt), gte(attendanceSession.endsAt, now)))
      .orderBy(asc(attendanceSession.startsAt));
  }

  if (scope === "past") {
    return db
      .select()
      .from(attendanceSession)
      .where(and(base, isPast(now)))
      .orderBy(desc(attendanceSession.startsAt))
      .limit(PAST_LIMIT);
  }

  return db
    .select()
    .from(attendanceSession)
    .where(base)
    .orderBy(desc(attendanceSession.startsAt))
    .limit(PAST_LIMIT);
}

export interface RecordJson {
  personId: string;
  name: string;
  email: string | null;
  identifier: string | null;
  /** In one of the session's groups, or registered. A walk-in is neither. */
  expected: boolean;
  /** Came through the public registration page. */
  registered: boolean;
  status: AttendanceStatus | null;
  method: string | null;
  checkedInAt: string | null;
  note: string | null;
}

/** Everyone expected, plus anyone with a record, with what the record says. */
export async function sessionRecords(db: Database, sessionId: string): Promise<RecordJson[]> {
  const [expected, registered, records] = await Promise.all([
    expectedPersonIds(db, sessionId),
    registeredPersonIds(db, sessionId),
    db.select().from(attendanceRecord).where(eq(attendanceRecord.sessionId, sessionId)),
  ]);

  const expectedSet = new Set(expected);
  const registeredSet = new Set(registered);
  const ids = [...new Set([...expected, ...records.map((row) => row.personId)])];
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

  const byPerson = new Map(records.map((row) => [row.personId, row]));

  return people.map((row) => {
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
  sessionId: string;
  personId: string;
  status: AttendanceStatus;
  method: RecordRow["method"];
  checkedInAt: Date | null;
  note?: string | null;
  markedBy?: string | null;
}

/** One row per person per session; a later write replaces the earlier one. */
export async function upsertRecord(db: Database, params: UpsertRecordParams): Promise<RecordRow> {
  const [row] = await db
    .insert(attendanceRecord)
    .values({
      id: crypto.randomUUID(),
      sessionId: params.sessionId,
      personId: params.personId,
      status: params.status,
      method: params.method,
      checkedInAt: params.checkedInAt,
      note: params.note ?? null,
      markedBy: params.markedBy ?? null,
    })
    .onConflictDoUpdate({
      target: [attendanceRecord.sessionId, attendanceRecord.personId],
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

export async function existingRecord(db: Database, sessionId: string, personId: string) {
  const rows = await db
    .select()
    .from(attendanceRecord)
    .where(and(eq(attendanceRecord.sessionId, sessionId), eq(attendanceRecord.personId, personId)))
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

export async function isExpected(db: Database, sessionId: string, personId: string) {
  const [inGroup, registered] = await Promise.all([
    db
      .select({ personId: groupMember.personId })
      .from(sessionGroup)
      .innerJoin(groupMember, eq(groupMember.groupId, sessionGroup.groupId))
      .where(and(eq(sessionGroup.sessionId, sessionId), eq(groupMember.personId, personId)))
      .limit(1),
    db
      .select({ personId: sessionRegistration.personId })
      .from(sessionRegistration)
      .where(
        and(
          eq(sessionRegistration.sessionId, sessionId),
          eq(sessionRegistration.personId, personId),
        ),
      )
      .limit(1),
  ]);

  return inGroup.length > 0 || registered.length > 0;
}
