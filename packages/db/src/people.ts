import { and, eq } from "drizzle-orm";
import type { Database } from "#src/index";
import { person } from "#src/schema";

export interface EnsurePersonParams {
  organizationId: string;
  userId: string;
  name: string;
  email: string;
}

/**
 * Links an account to its directory row. A row imported or invited under the
 * same email is claimed; otherwise a fresh row is created. Runs whenever a
 * user becomes a member, so every member is also a person.
 */
export async function ensurePersonForUser(db: Database, params: EnsurePersonParams) {
  const { organizationId, userId, name, email } = params;
  const normalizedEmail = email.trim().toLowerCase();

  const linked = await db
    .select({ id: person.id })
    .from(person)
    .where(and(eq(person.organizationId, organizationId), eq(person.userId, userId)))
    .limit(1);

  if (linked[0]) return linked[0].id;

  const byEmail = await db
    .select({ id: person.id })
    .from(person)
    .where(and(eq(person.organizationId, organizationId), eq(person.email, normalizedEmail)))
    .limit(1);

  const existing = byEmail[0];

  if (existing) {
    await db
      .update(person)
      .set({ userId, updatedAt: new Date() })
      .where(eq(person.id, existing.id));

    return existing.id;
  }

  const id = crypto.randomUUID();

  await db.insert(person).values({
    id,
    organizationId,
    userId,
    name,
    email: normalizedEmail,
  });

  return id;
}
