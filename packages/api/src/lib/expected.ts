import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { A } from "@mobily/ts-belt";
import { eq } from "drizzle-orm";

const { event: eventTable, eventGroup, eventRegistration, groupMember } = schema;

export type EventRow = typeof eventTable.$inferSelect;

/** Everyone in the event's groups, plus everyone who registered, once. */
export async function expectedPersonIds(db: Database, eventId: string): Promise<readonly string[]> {
  const [fromGroups, registered] = await Promise.all([
    db
      .selectDistinct({ personId: groupMember.personId })
      .from(eventGroup)
      .innerJoin(groupMember, eq(groupMember.groupId, eventGroup.groupId))
      .where(eq(eventGroup.eventId, eventId)),
    db
      .select({ personId: eventRegistration.personId })
      .from(eventRegistration)
      .where(eq(eventRegistration.eventId, eventId)),
  ]);

  return [...new Set(A.map([...fromGroups, ...registered], (row) => row.personId))];
}

export async function registeredPersonIds(
  db: Database,
  eventId: string,
): Promise<readonly string[]> {
  const rows = await db
    .select({ personId: eventRegistration.personId })
    .from(eventRegistration)
    .where(eq(eventRegistration.eventId, eventId));

  return A.map(rows, (row) => row.personId);
}
