import { and, eq } from "drizzle-orm";
import { createDb } from "#src/index";
import { ensurePersonForUser } from "#src/people";
import {
  member,
  type OnboardingStep,
  type OrganizationRole,
  organization,
  user,
} from "#src/schema";

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
  role: OrganizationRole;
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

    await ensurePersonForUser(db, {
      organizationId: foundOrg.id,
      userId: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
    });

    return { ok: true };
  } finally {
    await close();
  }
}

export type MarkUserResult = { ok: true } | { ok: false; reason: "user-not-found" };

export interface MarkUserOptions {
  connectionString: string;
  email: string;
  /** Skip onboarding for an account the operator created with a password. */
  onboardingStep?: OnboardingStep;
  canCreateOrganizations?: boolean;
}

/** Sets the operator-only flags on an account. */
export async function markUser(options: MarkUserOptions): Promise<MarkUserResult> {
  const { db, close } = createDb({ connectionString: options.connectionString, max: 1 });

  try {
    const [updated] = await db
      .update(user)
      .set({
        ...(options.onboardingStep ? { onboardingStep: options.onboardingStep } : {}),
        ...(options.canCreateOrganizations === undefined
          ? {}
          : { canCreateOrganizations: options.canCreateOrganizations }),
        updatedAt: new Date(),
      })
      .where(eq(user.email, options.email))
      .returning({ id: user.id });

    return updated ? { ok: true } : { ok: false, reason: "user-not-found" };
  } finally {
    await close();
  }
}
