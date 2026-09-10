import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { and, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { expectedPersonIds, type SessionRow } from "#src/lib/expected";
import {
  adminUserIds,
  createNotifications,
  managerUserIds,
  type NotificationInput,
  type NotificationRow,
  userIdsForPeople,
} from "#src/lib/notifications";

const { attendanceSession, schedule, user } = schema;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * A session that starts sooner than this gets the hour reminder only. It
 * stops a session created at short notice from firing both at once.
 */
const BOTH_REMINDERS_GAP_MS = 2 * HOUR_MS;

/**
 * Sessions carry absolute instants, so the wording of a reminder needs a
 * zone to read in. A reader who chose one on their account gets theirs; for
 * the rest, schedules are the only place an organization states one, so the
 * most used one wins, and UTC covers an organization without any.
 */
async function organizationTimezone(db: Database, organizationId: string): Promise<string> {
  const rows = await db
    .select({ timezone: schedule.timezone })
    .from(schedule)
    .where(and(eq(schedule.organizationId, organizationId), eq(schedule.active, true)));

  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.timezone, (counts.get(row.timezone) ?? 0) + 1);

  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return best?.[0] ?? "UTC";
}

/** The zone each account chose, for the ones that did. */
async function userTimezones(db: Database, userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const rows = await db
    .select({ id: user.id, timezone: user.timezone })
    .from(user)
    .where(inArray(user.id, userIds));

  return new Map(rows.flatMap((row) => (row.timezone ? [[row.id, row.timezone] as const] : [])));
}

function whenLine(session: SessionRow, timezone: string): string {
  const start = new TZDate(session.startsAt, timezone);
  const end = new TZDate(session.endsAt, timezone);

  return `${format(start, "EEE d MMM, HH:mm")} to ${format(end, "HH:mm")} (${timezone}).`;
}

type ReminderKind = "day" | "hour";

/**
 * Tells everyone expected that a session is near: once the day before, once
 * the hour before. The dedupe key holds the session and the kind, so a tick
 * every minute still sends one of each.
 */
export async function notifyDueReminders(
  db: Database,
  organizationId: string,
  now: Date = new Date(),
): Promise<NotificationRow[]> {
  const upcoming = await db
    .select()
    .from(attendanceSession)
    .where(
      and(
        eq(attendanceSession.organizationId, organizationId),
        isNull(attendanceSession.closedAt),
        gt(attendanceSession.startsAt, now),
        lte(attendanceSession.startsAt, new Date(now.getTime() + DAY_MS)),
      ),
    );

  if (upcoming.length === 0) return [];

  const timezone = await organizationTimezone(db, organizationId);
  const rows: NotificationInput[] = [];

  for (const session of upcoming) {
    const untilStart = session.startsAt.getTime() - now.getTime();

    const kinds: ReminderKind[] = [];
    if (untilStart > BOTH_REMINDERS_GAP_MS) kinds.push("day");
    if (untilStart <= HOUR_MS) kinds.push("hour");
    if (kinds.length === 0) continue;

    const personIds = await expectedPersonIds(db, session.id);
    const userIds = await userIdsForPeople(db, personIds);
    if (userIds.length === 0) continue;

    const zones = await userTimezones(db, userIds);

    for (const kind of kinds) {
      const title =
        kind === "hour"
          ? `${session.title} starts within the hour`
          : `${session.title} is coming up`;

      for (const userId of userIds) {
        rows.push({
          organizationId,
          userId,
          type: "session-reminder",
          title,
          body: whenLine(session, zones.get(userId) ?? timezone),
          href: "/my/sessions",
          dedupeKey: `session-reminder:${session.id}:${kind}`,
        });
      }
    }
  }

  return createNotifications(db, rows);
}

export interface SessionClosedCounts {
  present: number;
  late: number;
  excused: number;
  absent: number;
}

/** Tells the organizers a session closed, and how it went. */
export async function notifySessionClosed(
  db: Database,
  session: SessionRow,
  counts: SessionClosedCounts,
): Promise<NotificationRow[]> {
  const userIds = await managerUserIds(db, session.organizationId);
  if (userIds.length === 0) return [];

  const body = `${counts.present} present, ${counts.late} late, ${counts.excused} excused, ${counts.absent} absent.`;

  return createNotifications(
    db,
    userIds.map((userId) => ({
      organizationId: session.organizationId,
      userId,
      type: "session-closed" as const,
      title: `${session.title} closed`,
      body,
      href: `/sessions/${session.id}`,
      dedupeKey: `session-closed:${session.id}`,
    })),
  );
}

export interface LeaveRequestedParams {
  organizationId: string;
  requestId: string;
  personName: string;
  sessionTitle: string;
  reason: string;
}

/** Tells the organizers somebody asks to be excused. */
export async function notifyLeaveRequested(
  db: Database,
  params: LeaveRequestedParams,
): Promise<NotificationRow[]> {
  const userIds = await managerUserIds(db, params.organizationId);
  if (userIds.length === 0) return [];

  return createNotifications(
    db,
    userIds.map((userId) => ({
      organizationId: params.organizationId,
      userId,
      type: "leave-requested" as const,
      title: `${params.personName} asks to miss ${params.sessionTitle}`,
      body: params.reason,
      href: "/leave",
      dedupeKey: `leave-requested:${params.requestId}:${userId}`,
    })),
  );
}

export interface LeaveDecidedParams {
  organizationId: string;
  requestId: string;
  /** The account behind the person who asked. Null when they have none. */
  userId: string | null;
  sessionTitle: string;
  decision: "approved" | "declined";
  note: string | null;
}

/** Tells the member what the organizer decided. */
export async function notifyLeaveDecided(
  db: Database,
  params: LeaveDecidedParams,
): Promise<NotificationRow[]> {
  if (!params.userId) return [];

  const approved = params.decision === "approved";

  return createNotifications(db, [
    {
      organizationId: params.organizationId,
      userId: params.userId,
      type: "leave-decided",
      title: `Your leave for ${params.sessionTitle} was ${params.decision}`,
      body:
        params.note ??
        (approved
          ? "The record for this session says excused."
          : "The record stays as it is. Talk to an organizer if that is wrong."),
      href: "/my/leave",
      dedupeKey: `leave-decided:${params.requestId}`,
    },
  ]);
}

export interface JoinRequestedParams {
  organizationId: string;
  requestId: string;
  /** The account that asks, as the admins will read it. */
  personName: string;
  email: string;
  message: string | null;
}

/** Tells the admins that somebody from a claimed domain asks to come in. */
export async function notifyJoinRequested(
  db: Database,
  params: JoinRequestedParams,
): Promise<NotificationRow[]> {
  const userIds = await adminUserIds(db, params.organizationId);
  if (userIds.length === 0) return [];

  return createNotifications(
    db,
    userIds.map((userId) => ({
      organizationId: params.organizationId,
      userId,
      type: "join-requested" as const,
      title: `${params.personName} asks to join`,
      body: params.message ?? params.email,
      href: "/settings?tab=requests",
      dedupeKey: `join-requested:${params.requestId}:${userId}`,
    })),
  );
}

export interface JoinDecidedParams {
  organizationId: string;
  organizationName: string;
  requestId: string;
  userId: string;
  decision: "approved" | "declined";
  note: string | null;
}

/** Tells the account whether it is in. */
export async function notifyJoinDecided(
  db: Database,
  params: JoinDecidedParams,
): Promise<NotificationRow[]> {
  const approved = params.decision === "approved";

  return createNotifications(db, [
    {
      organizationId: params.organizationId,
      userId: params.userId,
      type: "join-decided",
      title: approved
        ? `You are in ${params.organizationName}`
        : `${params.organizationName} declined your request`,
      body:
        params.note ??
        (approved
          ? "Open absqir to see your events."
          : "Ask somebody there to invite you if that is wrong."),
      href: "/",
      dedupeKey: `join-decided:${params.requestId}`,
    },
  ]);
}
