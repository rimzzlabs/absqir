import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { A } from "@mobily/ts-belt";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { match, P } from "ts-pattern";

const { event: eventTable, attendanceRecord, person, group, groupMember, eventGroup } = schema;

export interface ReportRange {
  from: Date;
  to: Date;
  /** Only events that expect this group. Null means every event. */
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

/** Events of the organization that start inside the range, oldest first. */
async function eventIdsInRange(
  db: Database,
  organizationId: string,
  range: ReportRange,
): Promise<readonly string[]> {
  const where = and(
    eq(eventTable.organizationId, organizationId),
    gte(eventTable.startsAt, range.from),
    lte(eventTable.startsAt, range.to),
  );

  const rows = await match(range.groupId)
    .with(
      P.string.minLength(1),
      async (groupId) =>
        await db
          .selectDistinct({ id: eventTable.id })
          .from(eventTable)
          .innerJoin(eventGroup, eq(eventGroup.eventId, eventTable.id))
          .where(and(where, eq(eventGroup.groupId, groupId))),
    )
    .otherwise(async () => await db.select({ id: eventTable.id }).from(eventTable).where(where));

  return A.map(rows, (row) => row.id);
}

export interface ReportSummary {
  from: string;
  to: string;
  events: number;
  /** Events that already closed, so their absent rows exist. */
  closedEvents: number;
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

export interface EventReportRow {
  eventId: string;
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
  const ids = await eventIdsInRange(db, organizationId, range);

  const base = {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    events: ids.length,
  };

  if (ids.length === 0) {
    return {
      ...base,
      closedEvents: 0,
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
      .where(inArray(attendanceRecord.eventId, ids)),
    db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(eventTable)
      .where(and(inArray(eventTable.id, ids), isNotNull(eventTable.closedAt))),
  ]);

  const row = totals[0];
  const counts: StatusCounts = match(row)
    .with(P.nullish, () => ({ ...EMPTY }))
    .otherwise((row) => ({
      present: row.present,
      late: row.late,
      excused: row.excused,
      absent: row.absent,
    }));

  return {
    ...base,
    closedEvents: closed[0]?.value ?? 0,
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
): Promise<readonly PersonReportRow[]> {
  const ids = await eventIdsInRange(db, organizationId, range);
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
    .where(inArray(attendanceRecord.eventId, ids))
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
): Promise<readonly GroupReportRow[]> {
  const ids = await eventIdsInRange(db, organizationId, range);

  const groups = await db
    .select({ id: group.id, name: group.name })
    .from(group)
    .where(eq(group.organizationId, organizationId))
    .orderBy(asc(sql`lower(${group.name})`));

  if (groups.length === 0) return [];

  // A person can sit in more than one group, so the counts are read per group
  // instead of grouped once: the same record belongs to every group the
  // person is in.
  const rows = await match(ids.length)
    .with(0, async () => [])
    .otherwise(
      async () =>
        await db
          .select({
            groupId: groupMember.groupId,
            people: sql<number>`count(distinct ${attendanceRecord.personId})`.mapWith(Number),
            ...statusCountColumns,
          })
          .from(attendanceRecord)
          .innerJoin(groupMember, eq(groupMember.personId, attendanceRecord.personId))
          .where(
            and(
              inArray(attendanceRecord.eventId, ids),
              inArray(
                groupMember.groupId,
                A.map(groups, (row) => row.id),
              ),
            ),
          )
          .groupBy(groupMember.groupId),
    );

  const byGroup = new Map(A.map(rows, (row) => [row.groupId, row]));

  return A.map(groups, (row) => {
    const found = byGroup.get(row.id);
    const counts: StatusCounts = match(found)
      .with(P.nullish, () => ({ ...EMPTY }))
      .otherwise((found) => ({
        present: found.present,
        late: found.late,
        excused: found.excused,
        absent: found.absent,
      }));

    return {
      groupId: row.id,
      name: row.name,
      people: found?.people ?? 0,
      counts,
      attendanceRate: attendanceRate(counts),
    };
  });
}

export async function reportByEvent(
  db: Database,
  organizationId: string,
  range: ReportRange,
): Promise<readonly EventReportRow[]> {
  const ids = await eventIdsInRange(db, organizationId, range);
  if (ids.length === 0) return [];

  const [events, rows] = await Promise.all([
    db
      .select({
        id: eventTable.id,
        title: eventTable.title,
        startsAt: eventTable.startsAt,
        endsAt: eventTable.endsAt,
        closedAt: eventTable.closedAt,
      })
      .from(eventTable)
      .where(inArray(eventTable.id, ids))
      .orderBy(desc(eventTable.startsAt)),
    db
      .select({ eventId: attendanceRecord.eventId, ...statusCountColumns })
      .from(attendanceRecord)
      .where(inArray(attendanceRecord.eventId, ids))
      .groupBy(attendanceRecord.eventId),
  ]);

  const byEvent = new Map(A.map(rows, (row) => [row.eventId, row]));

  return A.map(events, (row) => {
    const found = byEvent.get(row.id);
    const counts: StatusCounts = match(found)
      .with(P.nullish, () => ({ ...EMPTY }))
      .otherwise((found) => ({
        present: found.present,
        late: found.late,
        excused: found.excused,
        absent: found.absent,
      }));

    return {
      eventId: row.id,
      title: row.title,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      closed: row.closedAt !== null,
      counts,
      attendanceRate: attendanceRate(counts),
    };
  });
}
