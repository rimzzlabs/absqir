import { notificationBody, notificationTitle } from "@absqir/core/notification-text";
import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import type { NotificationChannel, NotificationType } from "@absqir/db/schema";
import { type Locale, type NotifyKey, translatorFor } from "@absqir/i18n";
import type { Mailer } from "@absqir/transactional";
import { A, pipe } from "@mobily/ts-belt";
import { and, asc, desc, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Context } from "hono";
import { match, P } from "ts-pattern";
import type { AppEnv } from "#src/types";

const { notification, member, person, user, organization } = schema;

export type NotificationRow = typeof notification.$inferSelect;

export interface NotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  /** The words as they stand now, for anything that reads the row raw. */
  title: string;
  body?: string | null;
  /** The key and the values the words are made from at read time. */
  titleKey?: NotifyKey | null;
  titleParams?: Record<string, string | number> | null;
  /** Absent when the body is somebody's own words. */
  bodyKey?: NotifyKey | null;
  bodyParams?: Record<string, string | number> | null;
  href?: string | null;
  /** Two writes with the same key for one person make one row. */
  dedupeKey?: string | null;
}

/** Types worth an email. The rest live in the app, where the reader looks. */
const EMAILED: ReadonlySet<NotificationType> = new Set([
  "event-reminder",
  "leave-decided",
  "leave-requested",
  "join-requested",
  "join-decided",
  // A member who cannot check in is stuck until somebody reads this, and a
  // decision changes their attendance record, so both leave the app.
  "check-in-reported",
  "check-in-decided",
]);

/**
 * The language each account reads in. A notification is written once per
 * reader, so each row can carry that reader's own words.
 */
export async function localesFor(
  db: Database,
  userIds: readonly string[],
): Promise<Map<string, Locale>> {
  if (userIds.length === 0) return new Map();

  const rows = await db
    .select({ id: user.id, locale: user.locale })
    .from(user)
    .where(inArray(user.id, [...userIds]));

  return new Map(
    A.flatMap(rows, (row) =>
      match(row.locale)
        .with(P.nonNullable, (locale) => [[row.id, locale] as const])
        .otherwise(() => []),
    ),
  );
}

/** The translator for one reader, English for an account that chose nothing. */
export function translatorFrom(locales: Map<string, Locale>, userId: string) {
  return translatorFor(locales.get(userId) ?? "en");
}

/** A channel a written row can carry. `none` never reaches the table. */
export type DeliveredChannel = Exclude<NotificationChannel, "none">;

/** Whether a row with this channel shows in the bell and the list. */
export function reachesApp(channel: NotificationChannel): boolean {
  return channel === "all" || channel === "in-app";
}

/** Whether a row with this channel may go out by email. */
export function reachesEmail(channel: NotificationChannel): boolean {
  return channel === "all" || channel === "email";
}

/**
 * Stamps each row with its reader's choice and drops the rows for readers
 * who asked for silence. Pure, so the tests need no database.
 */
export function routeByChannel<T extends { userId: string }>(
  rows: readonly T[],
  channelOf: (userId: string) => NotificationChannel,
): readonly (T & { channel: DeliveredChannel })[] {
  return A.flatMap(rows, (row) => {
    const channel = channelOf(row.userId);
    return match(channel)
      .with("none", () => [])
      .otherwise((channel) => [{ ...row, channel }]);
  });
}

async function channelsFor(
  db: Database,
  userIds: string[],
): Promise<Map<string, NotificationChannel>> {
  if (userIds.length === 0) return new Map();

  const rows = await db
    .select({ id: user.id, channel: user.notificationChannel })
    .from(user)
    .where(inArray(user.id, userIds));

  return new Map(A.map(rows, (row) => [row.id, row.channel]));
}

/**
 * Writes the notifications that are new and returns only those. A repeat of
 * a keyed row is dropped by the partial unique index, so a caller can run
 * as often as it likes and nobody is told twice. Each row carries the
 * reader's channel choice, and a reader who chose `none` gets no row.
 */
export async function createNotifications(
  db: Database,
  rows: readonly NotificationInput[],
): Promise<NotificationRow[]> {
  if (rows.length === 0) return [];

  const channels = await channelsFor(db, [...new Set(A.map(rows, (row) => row.userId))]);
  const routed = routeByChannel(rows, (userId) => channels.get(userId) ?? "all");
  if (routed.length === 0) return [];

  return (
    db
      .insert(notification)
      .values([
        ...A.map(routed, (row) => ({
          id: crypto.randomUUID(),
          organizationId: row.organizationId,
          userId: row.userId,
          type: row.type,
          title: row.title,
          body: row.body ?? null,
          titleKey: row.titleKey ?? null,
          titleParams: row.titleParams ?? null,
          bodyKey: row.bodyKey ?? null,
          bodyParams: row.bodyParams ?? null,
          href: row.href ?? null,
          dedupeKey: row.dedupeKey ?? null,
          channel: row.channel,
        })),
      ])
      // `where` states the partial index predicate, so Postgres can infer the
      // unique index that holds only the keyed rows.
      .onConflictDoNothing({
        target: [notification.userId, notification.dedupeKey],
        where: sql`${notification.dedupeKey} is not null`,
      })
      .returning()
  );
}

/**
 * Emails the notifications that deserve one. Failures are swallowed on
 * purpose: a mail provider outage must never fail the request that
 * produced the notification, and the in-app row already landed.
 */
export async function emailNotifications(
  db: Database,
  mailer: Mailer | null,
  origin: string,
  rows: NotificationRow[],
): Promise<void> {
  const worth = A.filter(rows, (row) => EMAILED.has(row.type) && reachesEmail(row.channel));
  if (!mailer || worth.length === 0) return;

  const userIds = [...new Set(A.map(worth, (row) => row.userId))];
  const organizationIds = [...new Set(A.map(worth, (row) => row.organizationId))];

  const [people, organizations] = await Promise.all([
    db
      .select({ id: user.id, email: user.email, locale: user.locale, timezone: user.timezone })
      .from(user)
      .where(inArray(user.id, userIds)),
    db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(inArray(organization.id, organizationIds)),
  ]);

  const emailOf = new Map(A.map(people, (row) => [row.id, row.email]));
  const localeOf = new Map(A.map(people, (row) => [row.id, row.locale ?? "en"] as const));
  const zoneOf = new Map(A.map(people, (row) => [row.id, row.timezone] as const));
  const nameOf = new Map(A.map(organizations, (row) => [row.id, row.name]));

  for (const row of worth) {
    const to = emailOf.get(row.userId);
    if (!to) continue;

    const locale = localeOf.get(row.userId) ?? "en";
    const t = translatorFor(locale);

    try {
      await mailer.sendNotification(to, {
        locale,
        // The words are made here rather than read off the row, so the
        // message says the same thing the app will say when they open it.
        title: notificationTitle(t, row),
        body: notificationBody(t, row, { timezone: zoneOf.get(row.userId) ?? null, locale }),
        organizationName:
          nameOf.get(row.organizationId) ?? t("email:notification.yourOrganization"),
        url: `${origin}${row.href ?? "/notifications"}`,
        action: t(`email:actions.${row.type}`),
      });
    } catch (error) {
      console.error({ message: "notification email failed", id: row.id, error });
    }
  }
}

/**
 * Hands the email fan-out to the platform, so the reply goes out while the
 * mail provider takes its time.
 */
export function deliver(c: Context<AppEnv>, rows: NotificationRow[]): void {
  if (rows.length === 0) return;

  const origin = new URL(c.req.url).origin;

  c.executionCtx.waitUntil(emailNotifications(c.var.db, c.var.mailer, origin, rows));
}

/** The accounts that run the organization: organizer, admin, owner. */
export async function managerUserIds(
  db: Database,
  organizationId: string,
): Promise<readonly string[]> {
  const rows = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, organizationId));

  return pipe(
    rows,
    A.filter((row) => row.role !== "member"),
    A.map((row) => row.userId),
  );
}

/** The accounts that decide who gets in: admin and owner. */
export async function adminUserIds(
  db: Database,
  organizationId: string,
): Promise<readonly string[]> {
  const rows = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, organizationId));

  return pipe(
    rows,
    A.filter((row) => row.role === "owner" || row.role === "admin"),
    A.map((row) => row.userId),
  );
}

/** The accounts behind the given directory rows. People without one drop out. */
export async function userIdsForPeople(
  db: Database,
  personIds: readonly string[],
): Promise<readonly string[]> {
  if (personIds.length === 0) return [];

  const rows = await db
    .select({ userId: person.userId })
    .from(person)
    .where(inArray(person.id, personIds));

  return A.flatMap(rows, (row) =>
    match(row.userId)
      .with(P.string.minLength(1), (userId) => [userId])
      .otherwise(() => []),
  );
}

const LIST_LIMIT = 100;

/** The rows the app shows. An email-only row is a record of a mail, not news. */
const inApp = ne(notification.channel, "email");

export async function listNotifications(
  db: Database,
  userId: string,
  organizationId: string,
  scope: "all" | "unread",
): Promise<NotificationRow[]> {
  const where = and(
    eq(notification.userId, userId),
    eq(notification.organizationId, organizationId),
    inApp,
    match(scope)
      .with("unread", () => isNull(notification.readAt))
      .otherwise(() => undefined),
  );

  return db
    .select()
    .from(notification)
    .where(where)
    .orderBy(desc(notification.createdAt))
    .limit(LIST_LIMIT);
}

/**
 * The rows written at or after the cursor, oldest first, so a stream can
 * hand them over in the order they happened. The caller drops what it has
 * already sent: a JavaScript date holds milliseconds and Postgres holds
 * microseconds, so the last row sent sits on the cursor itself.
 */
export async function listNotificationsSince(
  db: Database,
  userId: string,
  organizationId: string,
  since: Date,
): Promise<NotificationRow[]> {
  return db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.userId, userId),
        eq(notification.organizationId, organizationId),
        inApp,
        gte(notification.createdAt, since),
      ),
    )
    .orderBy(asc(notification.createdAt))
    .limit(LIST_LIMIT);
}

export async function unreadCount(
  db: Database,
  userId: string,
  organizationId: string,
): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)`.mapWith(Number) })
    .from(notification)
    .where(
      and(
        eq(notification.userId, userId),
        eq(notification.organizationId, organizationId),
        inApp,
        isNull(notification.readAt),
      ),
    );

  return rows[0]?.value ?? 0;
}

/** Marks the given rows read, or every unread row when no id is given. */
export async function markRead(
  db: Database,
  userId: string,
  organizationId: string,
  ids: string[] | null,
): Promise<number> {
  const mine = and(
    eq(notification.userId, userId),
    eq(notification.organizationId, organizationId),
    inApp,
    isNull(notification.readAt),
  );

  const rows = await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      match(ids)
        .with(null, () => mine)
        .otherwise((ids) => and(mine, inArray(notification.id, ids))),
    )
    .returning({ id: notification.id });

  return rows.length;
}

export function toNotificationJson(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    titleKey: row.titleKey ?? null,
    titleParams: row.titleParams ?? null,
    bodyKey: row.bodyKey ?? null,
    bodyParams: row.bodyParams ?? null,
    href: row.href ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
