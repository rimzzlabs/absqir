import { claimableDomainOfEmail, normalizeDomain } from "@absqir/core/email-domain";
import { and, eq, isNotNull } from "drizzle-orm";
import type { Database } from "#src/index";
import { type JoinPolicy, joinRequest, organization, organizationDomain } from "#src/schema";

export interface DomainMatch {
  organizationId: string;
  name: string;
  slug: string;
  logo: string | null;
  domain: string;
  joinPolicy: JoinPolicy;
}

/**
 * The organization that proved it owns this domain, or null. Only a verified
 * claim counts: an unproven row opens no door. A caller decides what the
 * policy then allows.
 */
export async function findOrganizationByDomain(
  db: Database,
  value: string,
): Promise<DomainMatch | null> {
  const domain = normalizeDomain(value);
  if (domain === null) return null;

  const rows = await db
    .select({
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      domain: organizationDomain.domain,
      joinPolicy: organization.joinPolicy,
    })
    .from(organizationDomain)
    .innerJoin(organization, eq(organization.id, organizationDomain.organizationId))
    .where(and(eq(organizationDomain.domain, domain), isNotNull(organizationDomain.verifiedAt)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * The organization an address may ask to join. A mailbox provider such as
 * gmail.com never matches, so one account there cannot reach every other.
 */
export async function findOrganizationForEmail(
  db: Database,
  email: string,
): Promise<DomainMatch | null> {
  const domain = claimableDomainOfEmail(email);
  if (domain === null) return null;

  return findOrganizationByDomain(db, domain);
}

/**
 * True when a claimed and verified domain lets this address in without an
 * invitation. The sign-in door and the account create hook both ask this, so
 * a closed instance still opens for the people of a claimed domain.
 */
export async function domainOpensRegistration(db: Database, email: string): Promise<boolean> {
  const found = await findOrganizationForEmail(db, email);
  return found !== null && found.joinPolicy !== "closed";
}

/** The open request this account has at this organization, if any. */
export async function findPendingJoinRequest(
  db: Database,
  params: { organizationId: string; userId: string },
) {
  const rows = await db
    .select()
    .from(joinRequest)
    .where(
      and(
        eq(joinRequest.organizationId, params.organizationId),
        eq(joinRequest.userId, params.userId),
        eq(joinRequest.status, "pending"),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Claims the domain of the account that created the organization, when that
 * domain can be claimed at all. The address is already verified by a code, so
 * the claim counts as proven. A domain another organization holds is left
 * alone: the first claim wins, and the second one can prove itself by DNS.
 */
export async function seedOwnerDomain(
  db: Database,
  params: { organizationId: string; email: string },
): Promise<string | null> {
  const domain = claimableDomainOfEmail(params.email);
  if (domain === null) return null;

  const now = new Date();

  const inserted = await db
    .insert(organizationDomain)
    .values({
      id: crypto.randomUUID(),
      organizationId: params.organizationId,
      domain,
      verifiedAt: now,
      verifiedBy: "email",
      verificationToken: crypto.randomUUID().replaceAll("-", ""),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: organizationDomain.domain })
    .returning({ domain: organizationDomain.domain });

  return inserted[0]?.domain ?? null;
}
