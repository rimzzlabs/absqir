import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { ensurePersonForUser } from "@absqir/db/people";
import { and, count, eq } from "drizzle-orm";
import { statusOf } from "#src/lib/event-status";
import type { EventRow } from "#src/lib/events";

const { event: eventTable, eventRegistration, member, organization } = schema;

export type RegisterResult =
  | { ok: true; personId: string; already: boolean }
  | { ok: false; reason: "closed" | "over" | "full" };

/** True while the public page still takes people. */
export function takesRegistrations(event: EventRow, now: Date = new Date()): boolean {
  return event.registrationOpen && statusOf(event, now) !== "done";
}

export async function registrationCount(db: Database, eventId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(eventRegistration)
    .where(eq(eventRegistration.eventId, eventId));

  return row?.value ?? 0;
}

export interface RegisterParams {
  event: EventRow;
  user: { id: string; name: string; email: string };
  now?: Date;
}

/**
 * Puts a signed-in account on an open event's list. Someone who is not a
 * member yet joins the organization as a member on the way, with a
 * directory row, so the rest of the product treats them like anyone else.
 */
export async function registerForEvent(
  db: Database,
  params: RegisterParams,
): Promise<RegisterResult> {
  const { event, user } = params;
  const now = params.now ?? new Date();

  if (!event.registrationOpen) return { ok: false, reason: "closed" };
  if (statusOf(event, now) === "done") return { ok: false, reason: "over" };

  const memberships = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, event.organizationId), eq(member.userId, user.id)))
    .limit(1);

  if (!memberships[0]) {
    await db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: event.organizationId,
      userId: user.id,
      role: "member",
      createdAt: now,
    });
  }

  const personId = await ensurePersonForUser(db, {
    organizationId: event.organizationId,
    userId: user.id,
    name: user.name,
    email: user.email,
  });

  const existing = await db
    .select({ personId: eventRegistration.personId })
    .from(eventRegistration)
    .where(and(eq(eventRegistration.eventId, event.id), eq(eventRegistration.personId, personId)))
    .limit(1);

  if (existing[0]) return { ok: true, personId, already: true };

  if (event.registrationLimit !== null) {
    const taken = await registrationCount(db, event.id);
    if (taken >= event.registrationLimit) return { ok: false, reason: "full" };
  }

  await db.insert(eventRegistration).values({ eventId: event.id, personId }).onConflictDoNothing();

  return { ok: true, personId, already: false };
}

export async function findPublicEvent(db: Database, id: string) {
  const rows = await db
    .select({ event: eventTable, organizationName: organization.name })
    .from(eventTable)
    .innerJoin(organization, eq(organization.id, eventTable.organizationId))
    .where(eq(eventTable.id, id))
    .limit(1);

  return rows[0] ?? null;
}
