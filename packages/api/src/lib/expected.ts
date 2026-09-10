import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { A } from "@mobily/ts-belt";
import { eq } from "drizzle-orm";

const { attendanceSession, sessionGroup, sessionRegistration, groupMember } = schema;

export type SessionRow = typeof attendanceSession.$inferSelect;

/** Everyone in the session's groups, plus everyone who registered, once. */
export async function expectedPersonIds(db: Database, sessionId: string): Promise<string[]> {
  const [fromGroups, registered] = await Promise.all([
    db
      .selectDistinct({ personId: groupMember.personId })
      .from(sessionGroup)
      .innerJoin(groupMember, eq(groupMember.groupId, sessionGroup.groupId))
      .where(eq(sessionGroup.sessionId, sessionId)),
    db
      .select({ personId: sessionRegistration.personId })
      .from(sessionRegistration)
      .where(eq(sessionRegistration.sessionId, sessionId)),
  ]);

  return [...new Set(A.map([...fromGroups, ...registered], (row) => row.personId))];
}

export async function registeredPersonIds(db: Database, sessionId: string): Promise<string[]> {
  const rows = await db
    .select({ personId: sessionRegistration.personId })
    .from(sessionRegistration)
    .where(eq(sessionRegistration.sessionId, sessionId));

  return A.map(rows, (row) => row.personId);
}
