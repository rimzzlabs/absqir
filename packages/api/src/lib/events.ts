import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { ensurePersonForUser } from "@absqir/db/people";
import { and, count, eq } from "drizzle-orm";
import { statusOf } from "@/lib/session-status";
import type { SessionRow } from "@/lib/sessions";

const { attendanceSession, sessionRegistration, member, organization } = schema;

export type RegisterResult =
  | { ok: true; personId: string; already: boolean }
  | { ok: false; reason: "closed" | "over" | "full" };

/** True while the public page still takes people. */
export function takesRegistrations(session: SessionRow, now: Date = new Date()): boolean {
  return session.registrationOpen && statusOf(session, now) !== "done";
}

export async function registrationCount(db: Database, sessionId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(sessionRegistration)
    .where(eq(sessionRegistration.sessionId, sessionId));

  return row?.value ?? 0;
}

export interface RegisterParams {
  session: SessionRow;
  user: { id: string; name: string; email: string };
  now?: Date;
}

/**
 * Puts a signed-in account on an open session's list. Someone who is not a
 * member yet joins the organization as a member on the way, with a
 * directory row, so the rest of the product treats them like anyone else.
 */
export async function registerForSession(
  db: Database,
  params: RegisterParams,
): Promise<RegisterResult> {
  const { session, user } = params;
  const now = params.now ?? new Date();

  if (!session.registrationOpen) return { ok: false, reason: "closed" };
  if (statusOf(session, now) === "done") return { ok: false, reason: "over" };

  const memberships = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, session.organizationId), eq(member.userId, user.id)))
    .limit(1);

  if (!memberships[0]) {
    await db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: session.organizationId,
      userId: user.id,
      role: "member",
      createdAt: now,
    });
  }

  const personId = await ensurePersonForUser(db, {
    organizationId: session.organizationId,
    userId: user.id,
    name: user.name,
    email: user.email,
  });

  const existing = await db
    .select({ personId: sessionRegistration.personId })
    .from(sessionRegistration)
    .where(
      and(
        eq(sessionRegistration.sessionId, session.id),
        eq(sessionRegistration.personId, personId),
      ),
    )
    .limit(1);

  if (existing[0]) return { ok: true, personId, already: true };

  if (session.registrationLimit !== null) {
    const taken = await registrationCount(db, session.id);
    if (taken >= session.registrationLimit) return { ok: false, reason: "full" };
  }

  await db
    .insert(sessionRegistration)
    .values({ sessionId: session.id, personId })
    .onConflictDoNothing();

  return { ok: true, personId, already: false };
}

export async function findPublicSession(db: Database, id: string) {
  const rows = await db
    .select({ session: attendanceSession, organizationName: organization.name })
    .from(attendanceSession)
    .innerJoin(organization, eq(organization.id, attendanceSession.organizationId))
    .where(eq(attendanceSession.id, id))
    .limit(1);

  return rows[0] ?? null;
}
