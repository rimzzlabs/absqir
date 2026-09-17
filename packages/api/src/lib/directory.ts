import { type Database, schema } from "@absqir/db";
import { and, eq, exists, sql } from "drizzle-orm";

const { member, person } = schema;

/**
 * True for a person an event can expect, written against the `person` table of
 * the query it joins.
 *
 * Two kinds of row fail it. The check-in page belongs to the member role
 * alone: an owner, an admin and an organizer run the event from the scanner
 * instead of standing in its queue. And a person whose account left the
 * organization has no membership row left at all, so the same test drops them
 * without the directory row having to go.
 */
export function expectedAtEvents(db: Database, organizationId: string) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.userId, person.userId),
          eq(member.role, "member"),
        ),
      ),
  );
}
