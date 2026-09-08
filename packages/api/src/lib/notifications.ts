import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import type { NotificationType } from "@absqir/db/schema";
import type { Mailer } from "@absqir/transactional";
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv } from "@/types";

const { notification, member, person, user, organization } = schema;

export type NotificationRow = typeof notification.$inferSelect;

export interface NotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
  /** Two writes with the same key for one person make one row. */
  dedupeKey?: string | null;
}

/** Types worth an email. The rest live in the app, where the reader looks. */
const EMAILED: ReadonlySet<NotificationType> = new Set([
  "session-reminder",
  "leave-decided",
  "leave-requested",
]);

const ACTIONS: Record<NotificationType, string> = {
  "session-reminder": "Open my sessions",
  "session-closed": "Open the session",
  "leave-requested": "Open the queue",
  "leave-decided": "Open my leave",
};

/**
 * Writes the notifications that are new and returns only those. A repeat of
 * a keyed row is dropped by the partial unique index, so a caller can run
 * as often as it likes and nobody is told twice.
 */
export async function createNotifications(
  db: Database,
  rows: NotificationInput[],
): Promise<NotificationRow[]> {
  if (rows.length === 0) return [];

  return (
    db
      .insert(notification)
      .values(
        rows.map((row) => ({
          id: crypto.randomUUID(),
          organizationId: row.organizationId,
          userId: row.userId,
          type: row.type,
          title: row.title,
          body: row.body ?? null,
          href: row.href ?? null,
          dedupeKey: row.dedupeKey ?? null,
        })),
      )
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
  const worth = rows.filter((row) => EMAILED.has(row.type));
  if (!mailer || worth.length === 0) return;

  const userIds = [...new Set(worth.map((row) => row.userId))];
  const organizationIds = [...new Set(worth.map((row) => row.organizationId))];

  const [people, organizations] = await Promise.all([
    db.select({ id: user.id, email: user.email }).from(user).where(inArray(user.id, userIds)),
    db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(inArray(organization.id, organizationIds)),
  ]);

  const emailOf = new Map(people.map((row) => [row.id, row.email]));
  const nameOf = new Map(organizations.map((row) => [row.id, row.name]));

  for (const row of worth) {
    const to = emailOf.get(row.userId);
    if (!to) continue;

    try {
      await mailer.sendNotification(to, {
        title: row.title,
        body: row.body,
        organizationName: nameOf.get(row.organizationId) ?? "your organization",
        url: `${origin}${row.href ?? "/notifications"}`,
        action: ACTIONS[row.type],
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
export async function managerUserIds(db: Database, organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, organizationId));

  return rows.filter((row) => row.role !== "member").map((row) => row.userId);
}

/** The accounts behind the given directory rows. People without one drop out. */
export async function userIdsForPeople(db: Database, personIds: string[]): Promise<string[]> {
  if (personIds.length === 0) return [];

  const rows = await db
    .select({ userId: person.userId })
    .from(person)
    .where(inArray(person.id, personIds));

  return rows.flatMap((row) => (row.userId ? [row.userId] : []));
}

const LIST_LIMIT = 100;

export async function listNotifications(
  db: Database,
  userId: string,
  organizationId: string,
  scope: "all" | "unread",
): Promise<NotificationRow[]> {
  const where = and(
    eq(notification.userId, userId),
    eq(notification.organizationId, organizationId),
    scope === "unread" ? isNull(notification.readAt) : undefined,
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
    isNull(notification.readAt),
  );

  const rows = await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(ids === null ? mine : and(mine, inArray(notification.id, ids)))
    .returning({ id: notification.id });

  return rows.length;
}

export function toNotificationJson(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    href: row.href ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
