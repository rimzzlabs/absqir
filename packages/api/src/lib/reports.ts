import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { A } from "@mobily/ts-belt";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";

const { attendanceSession, attendanceRecord, person, group, groupMember, sessionGroup } = schema;

export interface ReportRange {
  from: Date;
  to: Date;
  /** Only sessions that expect this group. Null means every session. */
  groupId: string | null;
}

export interface StatusCounts {
  present: number;
  late: number;
  excused: number;
  absent: number;
}

const EMPTY: StatusCounts = { present: 0, late: 0, excused: 0, absent: 0 };

/**
 * Attended over attended plus absent. An excused person never counts against
 * the rate, and never for it: leave is neither presence nor absence.
 */
export function attendanceRate(counts: StatusCounts): number | null {
  const judged = counts.present + counts.late + counts.absent;
  if (judged === 0) return null;

  return Math.round(((counts.present + counts.late) / judged) * 1000) / 1000;
}

/** Of the times someone turned up, how often they were on time. */
export function punctualityRate(counts: StatusCounts): number | null {
  const showed = counts.present + counts.late;
  if (showed === 0) return null;

  return Math.round((counts.present / showed) * 1000) / 1000;
}

const statusCountColumns = {
  present: sql<number>`count(*) filter (where ${attendanceRecord.status} = 'present')`.mapWith(
    Number,
  ),
  late: sql<number>`count(*) filter (where ${attendanceRecord.status} = 'late')`.mapWith(Number),
  excused: sql<number>`count(*) filter (where ${attendanceRecord.status} = 'excused')`.mapWith(
    Number,
  ),
  absent: sql<number>`count(*) filter (where ${attendanceRecord.status} = 'absent')`.mapWith(
    Number,
  ),
};

/** Sessions of the organization that start inside the range, oldest first. */
async function sessionIdsInRange(
  db: Database,
  organizationId: string,
  range: ReportRange,
): Promise<string[]> {
  const where = and(
    eq(attendanceSession.organizationId, organizationId),
    gte(attendanceSession.startsAt, range.from),
    lte(attendanceSession.startsAt, range.to),
  );

  const rows = range.groupId
    ? await db
        .selectDistinct({ id: attendanceSession.id })
        .from(attendanceSession)
        .innerJoin(sessionGroup, eq(sessionGroup.sessionId, attendanceSession.id))
        .where(and(where, eq(sessionGroup.groupId, range.groupId)))
    : await db.select({ id: attendanceSession.id }).from(attendanceSession).where(where);

  return A.map(rows, (row) => row.id);
}

export interface ReportSummary {
  from: string;
  to: string;
  sessions: number;
  /** Sessions that already closed, so their absent rows exist. */
  closedSessions: number;
  people: number;
  counts: StatusCounts;
  attendanceRate: number | null;
  punctualityRate: number | null;
}

export interface PersonReportRow {
  personId: string;
  name: string;
  email: string | null;
  identifier: string | null;
  counts: StatusCounts;
  attendanceRate: number | null;
  punctualityRate: number | null;
}

export interface GroupReportRow {
  groupId: string;
  name: string;
  people: number;
  counts: StatusCounts;
  attendanceRate: number | null;
}

export interface SessionReportRow {
  sessionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  closed: boolean;
  counts: StatusCounts;
  attendanceRate: number | null;
}

export async function reportSummary(
  db: Database,
  organizationId: string,
  range: ReportRange,
): Promise<ReportSummary> {
  const ids = await sessionIdsInRange(db, organizationId, range);

  const base = {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    sessions: ids.length,
  };

  if (ids.length === 0) {
    return {
      ...base,
      closedSessions: 0,
      people: 0,
      counts: { ...EMPTY },
      attendanceRate: null,
      punctualityRate: null,
    };
  }

  const [totals, closed] = await Promise.all([
    db
      .select({
        ...statusCountColumns,
        people: sql<number>`count(distinct ${attendanceRecord.personId})`.mapWith(Number),
      })
      .from(attendanceRecord)
      .where(inArray(attendanceRecord.sessionId, ids)),
    db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(attendanceSession)
      .where(and(inArray(attendanceSession.id, ids), isNotNull(attendanceSession.closedAt))),
  ]);

  const row = totals[0];
  const counts: StatusCounts = row
    ? { present: row.present, late: row.late, excused: row.excused, absent: row.absent }
    : { ...EMPTY };

  return {
    ...base,
    closedSessions: closed[0]?.value ?? 0,
    people: row?.people ?? 0,
    counts,
    attendanceRate: attendanceRate(counts),
    punctualityRate: punctualityRate(counts),
  };
}

export async function reportByPerson(
  db: Database,
  organizationId: string,
  range: ReportRange,
): Promise<PersonReportRow[]> {
  const ids = await sessionIdsInRange(db, organizationId, range);
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      personId: person.id,
      name: person.name,
      email: person.email,
      identifier: person.identifier,
      ...statusCountColumns,
    })
    .from(attendanceRecord)
    .innerJoin(person, eq(person.id, attendanceRecord.personId))
    .where(inArray(attendanceRecord.sessionId, ids))
    .groupBy(person.id, person.name, person.email, person.identifier)
    .orderBy(asc(sql`lower(${person.name})`));

  return A.map(rows, (row) => {
    const counts: StatusCounts = {
      present: row.present,
      late: row.late,
      excused: row.excused,
      absent: row.absent,
    };

    return {
      personId: row.personId,
      name: row.name,
      email: row.email ?? null,
      identifier: row.identifier ?? null,
      counts,
      attendanceRate: attendanceRate(counts),
      punctualityRate: punctualityRate(counts),
    };
  });
}

export async function reportByGroup(
  db: Database,
  organizationId: string,
  range: ReportRange,
): Promise<GroupReportRow[]> {
  const ids = await sessionIdsInRange(db, organizationId, range);

  const groups = await db
    .select({ id: group.id, name: group.name })
    .from(group)
    .where(eq(group.organizationId, organizationId))
    .orderBy(asc(sql`lower(${group.name})`));

  if (groups.length === 0) return [];

  // A person can sit in more than one group, so the counts are read per group
  // instead of grouped once: the same record belongs to every group the
  // person is in.
  const rows =
    ids.length === 0
      ? []
      : await db
          .select({
            groupId: groupMember.groupId,
            people: sql<number>`count(distinct ${attendanceRecord.personId})`.mapWith(Number),
            ...statusCountColumns,
          })
          .from(attendanceRecord)
          .innerJoin(groupMember, eq(groupMember.personId, attendanceRecord.personId))
          .where(
            and(
              inArray(attendanceRecord.sessionId, ids),
              inArray(
                groupMember.groupId,
                A.map(groups, (row) => row.id),
              ),
            ),
          )
          .groupBy(groupMember.groupId);

  const byGroup = new Map(A.map(rows, (row) => [row.groupId, row]));

  return A.map(groups, (row) => {
    const found = byGroup.get(row.id);
    const counts: StatusCounts = found
      ? { present: found.present, late: found.late, excused: found.excused, absent: found.absent }
      : { ...EMPTY };

    return {
      groupId: row.id,
      name: row.name,
      people: found?.people ?? 0,
      counts,
      attendanceRate: attendanceRate(counts),
    };
  });
}

export async function reportBySession(
  db: Database,
  organizationId: string,
  range: ReportRange,
): Promise<SessionReportRow[]> {
  const ids = await sessionIdsInRange(db, organizationId, range);
  if (ids.length === 0) return [];

  const [sessions, rows] = await Promise.all([
    db
      .select({
        id: attendanceSession.id,
        title: attendanceSession.title,
        startsAt: attendanceSession.startsAt,
        endsAt: attendanceSession.endsAt,
        closedAt: attendanceSession.closedAt,
      })
      .from(attendanceSession)
      .where(inArray(attendanceSession.id, ids))
      .orderBy(desc(attendanceSession.startsAt)),
    db
      .select({ sessionId: attendanceRecord.sessionId, ...statusCountColumns })
      .from(attendanceRecord)
      .where(inArray(attendanceRecord.sessionId, ids))
      .groupBy(attendanceRecord.sessionId),
  ]);

  const bySession = new Map(A.map(rows, (row) => [row.sessionId, row]));

  return A.map(sessions, (row) => {
    const found = bySession.get(row.id);
    const counts: StatusCounts = found
      ? { present: found.present, late: found.late, excused: found.excused, absent: found.absent }
      : { ...EMPTY };

    return {
      sessionId: row.id,
      title: row.title,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      closed: row.closedAt !== null,
      counts,
      attendanceRate: attendanceRate(counts),
    };
  });
}
