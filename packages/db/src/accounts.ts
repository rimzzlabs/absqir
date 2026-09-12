import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "#src/index";
import { member, organization } from "#src/schema";

export interface SoleOwnership {
  organizationId: string;
  name: string;
  /** Members besides this account. Zero means nobody is left behind. */
  otherMembers: number;
}

export interface OwnedOrganization {
  id: string;
  name: string;
}

export interface MemberTally {
  organizationId: string;
  members: number;
  owners: number;
}

export interface PickSoleOwnershipsParams {
  /** The organizations where this account holds an owner seat. */
  owned: OwnedOrganization[];
  tallies: MemberTally[];
}

/**
 * Keeps the organizations with exactly one owner seat. The account delete
 * door reads this, so the arithmetic is separate from the query.
 */
export function pickSoleOwnerships(params: PickSoleOwnershipsParams): SoleOwnership[] {
  const byOrganization = new Map(params.tallies.map((row) => [row.organizationId, row]));

  return params.owned.flatMap((row) => {
    const tally = byOrganization.get(row.id);
    if (tally?.owners !== 1) return [];

    return [{ organizationId: row.id, name: row.name, otherMembers: tally.members - 1 }];
  });
}

/**
 * Every organization where this account holds the only owner seat. The
 * account page asks before it deletes anything, because an organization
 * with no owner can never be administered again.
 */
export async function soleOwnerships(db: Database, userId: string): Promise<SoleOwnership[]> {
  const owned = await db
    .select({ id: organization.id, name: organization.name })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.userId, userId), eq(member.role, "owner")));

  if (owned.length === 0) return [];

  const tallies = await db
    .select({
      organizationId: member.organizationId,
      members: count(),
      owners: sql<number>`count(*) filter (where ${member.role} = 'owner')`.mapWith(Number),
    })
    .from(member)
    .where(
      inArray(
        member.organizationId,
        owned.map((row) => row.id),
      ),
    )
    .groupBy(member.organizationId);

  return pickSoleOwnerships({ owned, tallies });
}

/**
 * Drops organizations by id. Every table under one cascades, so this takes
 * the directory, the events, and the records with it.
 */
export async function deleteOrganizations(db: Database, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  await db.delete(organization).where(inArray(organization.id, ids));
}
