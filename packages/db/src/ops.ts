import { and, eq } from "drizzle-orm";
import { createDb } from "@/index";
import { member, organization, user } from "@/schema";

/**
 * Operator actions the CLI triggers inside a one-off container. They live
 * here so the container scripts import one package instead of reaching for
 * drizzle-orm through a transitive dependency.
 */

export type AddMemberResult =
  | { ok: true }
  | { ok: false; reason: "user-not-found" | "organization-not-found" | "already-member" };

export interface AddMemberOptions {
  connectionString: string;
  email: string;
  organizationSlug: string;
  role: string;
}

export async function addMember(options: AddMemberOptions): Promise<AddMemberResult> {
  const { db, close } = createDb({ connectionString: options.connectionString, max: 1 });

  try {
    const users = await db.select().from(user).where(eq(user.email, options.email)).limit(1);
    const foundUser = users[0];
    if (!foundUser) return { ok: false, reason: "user-not-found" };

    const organizations = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, options.organizationSlug))
      .limit(1);
    const foundOrg = organizations[0];
    if (!foundOrg) return { ok: false, reason: "organization-not-found" };

    const memberships = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.userId, foundUser.id), eq(member.organizationId, foundOrg.id)))
      .limit(1);
    if (memberships[0]) return { ok: false, reason: "already-member" };

    await db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: foundOrg.id,
      userId: foundUser.id,
      role: options.role,
      createdAt: new Date(),
    });

    return { ok: true };
  } finally {
    await close();
  }
}
