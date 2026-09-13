import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import type { Translate } from "@absqir/i18n";
import { TZDate } from "@date-fns/tz";
import { A } from "@mobily/ts-belt";
import { format } from "date-fns";
import { and, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { match, P } from "ts-pattern";
import { type EventRow, expectedPersonIds } from "#src/lib/expected";
import {
  adminUserIds,
  createNotifications,
  localesFor,
  managerUserIds,
  type NotificationInput,
  type NotificationRow,
  translatorFrom,
  userIdsForPeople,
} from "#src/lib/notifications";

const { event: eventTable, schedule, user } = schema;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * An event that starts sooner than this gets the hour reminder only. It
 * stops an event created at short notice from firing both at once.
 */
const BOTH_REMINDERS_GAP_MS = 2 * HOUR_MS;

/**
 * Events carry absolute instants, so the wording of a reminder needs a
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

  const [best] = A.sort([...counts.entries()], (a, b) => b[1] - a[1]);

  return best?.[0] ?? "UTC";
}

/** The zone each account chose, for the ones that did. */
async function userTimezones(
  db: Database,
  userIds: readonly string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const rows = await db
    .select({ id: user.id, timezone: user.timezone })
    .from(user)
    .where(inArray(user.id, userIds));

  return new Map(
    A.flatMap(rows, (row) =>
      match(row.timezone)
        .with(P.string.minLength(1), (timezone) => [[row.id, timezone] as const])
        .otherwise(() => []),
    ),
  );
}

function whenLine(t: Translate, event: EventRow, timezone: string): string {
  const start = new TZDate(event.startsAt, timezone);
  const end = new TZDate(event.endsAt, timezone);

  return t("email:notify.when", {
    start: format(start, "EEE d MMM, HH:mm"),
    end: format(end, "HH:mm"),
    timezone,
  });
}

type ReminderKind = "day" | "hour";

/**
 * Tells everyone expected that an event is near: once the day before, once
 * the hour before. The dedupe key holds the event and the kind, so a tick
 * every minute still sends one of each.
 */
export async function notifyDueReminders(
  db: Database,
  organizationId: string,
  now: Date = new Date(),
): Promise<NotificationRow[]> {
  const upcoming = await db
    .select()
    .from(eventTable)
    .where(
      and(
        eq(eventTable.organizationId, organizationId),
        isNull(eventTable.closedAt),
        gt(eventTable.startsAt, now),
        lte(eventTable.startsAt, new Date(now.getTime() + DAY_MS)),
      ),
    );

  if (upcoming.length === 0) return [];

  const timezone = await organizationTimezone(db, organizationId);
  const rows: NotificationInput[] = [];

  for (const event of upcoming) {
    const untilStart = event.startsAt.getTime() - now.getTime();

    const kinds: ReminderKind[] = [];
    if (untilStart > BOTH_REMINDERS_GAP_MS) kinds.push("day");
    if (untilStart <= HOUR_MS) kinds.push("hour");
    if (kinds.length === 0) continue;

    const personIds = await expectedPersonIds(db, event.id);
    const userIds = await userIdsForPeople(db, personIds);
    if (userIds.length === 0) continue;

    const zones = await userTimezones(db, userIds);
    const locales = await localesFor(db, userIds);

    for (const kind of kinds) {
      for (const userId of userIds) {
        const t = translatorFrom(locales, userId);
        const title = match(kind)
          .with("hour", () => t("email:notify.reminderHour", { event: event.title }))
          .otherwise(() => t("email:notify.reminderDay", { event: event.title }));

        rows.push({
          organizationId,
          userId,
          type: "event-reminder",
          title,
          body: whenLine(t, event, zones.get(userId) ?? timezone),
          href: `/events/${event.id}`,
          dedupeKey: `event-reminder:${event.id}:${kind}`,
        });
      }
    }
  }

  return createNotifications(db, rows);
}

export interface EventClosedCounts {
  present: number;
  late: number;
  excused: number;
  absent: number;
}

/** Tells the organizers an event closed, and how it went. */
export async function notifyEventClosed(
  db: Database,
  event: EventRow,
  counts: EventClosedCounts,
): Promise<NotificationRow[]> {
  const userIds = await managerUserIds(db, event.organizationId);
  if (userIds.length === 0) return [];

  const locales = await localesFor(db, userIds);

  return createNotifications(
    db,
    A.map(userIds, (userId) => {
      const t = translatorFrom(locales, userId);

      return {
        organizationId: event.organizationId,
        userId,
        type: "event-closed" as const,
        title: t("email:notify.eventClosed", { event: event.title }),
        body: t("email:notify.eventClosedBody", {
          present: String(counts.present),
          late: String(counts.late),
          excused: String(counts.excused),
          absent: String(counts.absent),
        }),
        href: `/events/${event.id}`,
        dedupeKey: `event-closed:${event.id}`,
      };
    }),
  );
}

export interface LeaveRequestedParams {
  organizationId: string;
  requestId: string;
  personName: string;
  eventTitle: string;
  reason: string;
}

/** Tells the organizers somebody asks to be excused. */
export async function notifyLeaveRequested(
  db: Database,
  params: LeaveRequestedParams,
): Promise<NotificationRow[]> {
  const userIds = await managerUserIds(db, params.organizationId);
  if (userIds.length === 0) return [];

  const locales = await localesFor(db, userIds);

  return createNotifications(
    db,
    A.map(userIds, (userId) => ({
      organizationId: params.organizationId,
      userId,
      type: "leave-requested" as const,
      title: translatorFrom(locales, userId)("email:notify.leaveRequested", {
        name: params.personName,
        event: params.eventTitle,
      }),
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
  eventTitle: string;
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
  const t = translatorFrom(await localesFor(db, [params.userId]), params.userId);

  return createNotifications(db, [
    {
      organizationId: params.organizationId,
      userId: params.userId,
      type: "leave-decided",
      title: match(approved)
        .with(true, () => t("email:notify.leaveApproved", { event: params.eventTitle }))
        .otherwise(() => t("email:notify.leaveDeclined", { event: params.eventTitle })),
      body:
        params.note ??
        match(approved)
          .with(true, () => t("email:notify.leaveApprovedBody"))
          .otherwise(() => t("email:notify.leaveDeclinedBody")),
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

  const locales = await localesFor(db, userIds);

  return createNotifications(
    db,
    A.map(userIds, (userId) => ({
      organizationId: params.organizationId,
      userId,
      type: "join-requested" as const,
      title: translatorFrom(locales, userId)("email:notify.joinRequested", {
        name: params.personName,
      }),
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
  const t = translatorFrom(await localesFor(db, [params.userId]), params.userId);

  return createNotifications(db, [
    {
      organizationId: params.organizationId,
      userId: params.userId,
      type: "join-decided",
      title: match(approved)
        .with(true, () => t("email:notify.joinApproved", { organization: params.organizationName }))
        .otherwise(() => t("email:notify.joinDeclined", { organization: params.organizationName })),
      body:
        params.note ??
        match(approved)
          .with(true, () => t("email:notify.joinApprovedBody"))
          .otherwise(() => t("email:notify.joinDeclinedBody")),
      href: "/",
      dedupeKey: `join-decided:${params.requestId}`,
    },
  ]);
}

export interface CheckInReportedParams {
  organizationId: string;
  reportId: string;
  /** The member, as the organizers will read it. */
  personName: string;
  eventTitle: string;
  message: string;
}

/**
 * Tells the organizers that the place check turned somebody away who says
 * they were there. Nobody watches a queue they were never pointed at, and a
 * report nobody reads leaves the member absent.
 */
export async function notifyCheckInReported(
  db: Database,
  params: CheckInReportedParams,
): Promise<NotificationRow[]> {
  const userIds = await managerUserIds(db, params.organizationId);
  if (userIds.length === 0) return [];

  const locales = await localesFor(db, userIds);

  return createNotifications(
    db,
    A.map(userIds, (userId) => ({
      organizationId: params.organizationId,
      userId,
      type: "check-in-reported" as const,
      title: translatorFrom(locales, userId)("email:notify.checkInReported", {
        name: params.personName,
        event: params.eventTitle,
      }),
      body: params.message,
      href: "/check-in-problems",
      dedupeKey: `check-in-reported:${params.reportId}:${userId}`,
    })),
  );
}

export interface CheckInDecidedParams {
  organizationId: string;
  reportId: string;
  /** Null when the person has no account yet, and so nothing to read it with. */
  userId: string | null;
  eventTitle: string;
  approved: boolean;
  note: string | null;
}

/** Tells the member what came of their report. */
export async function notifyCheckInDecided(
  db: Database,
  params: CheckInDecidedParams,
): Promise<NotificationRow[]> {
  if (!params.userId) return [];

  const t = translatorFrom(await localesFor(db, [params.userId]), params.userId);

  return createNotifications(db, [
    {
      organizationId: params.organizationId,
      userId: params.userId,
      type: "check-in-decided",
      title: match(params.approved)
        .with(true, () => t("email:notify.checkInDecidedApproved", { event: params.eventTitle }))
        .otherwise(() => t("email:notify.checkInDecidedDeclined", { event: params.eventTitle })),
      body:
        params.note ??
        match(params.approved)
          .with(true, () => t("email:notify.checkInApprovedBody"))
          .otherwise(() => t("email:notify.checkInDeclinedBody")),
      href: "/my/events",
      dedupeKey: `check-in-decided:${params.reportId}`,
    },
  ]);
}
