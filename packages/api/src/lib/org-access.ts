import { isRoleName, type RoleName, roleAtLeast } from "@absqir/auth";
import { schema } from "@absqir/db";
import { and, eq } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "@/types";

const { member, session: sessionTable } = schema;

interface Membership {
  organizationId: string;
  role: RoleName;
}

async function findMembership(
  c: Context<AppEnv>,
  userId: string,
  organizationId: string,
): Promise<Membership | null> {
  const rows = await c.var.db
    .select({ organizationId: member.organizationId, role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);

  const row = rows[0];
  if (!row || !isRoleName(row.role)) return null;

  return { organizationId: row.organizationId, role: row.role };
}

/**
 * Resolves the caller's active organization, proves membership, and puts the
 * id and role on the context, so every handler behind it reads two variables
 * instead of repeating the guard. When the session carries no active
 * organization, or a stale one the caller has left, the guard falls back to
 * the first membership and writes it back to the session.
 */
export function organizationGuard(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    // Idempotent: overlapping route patterns may run the guard twice.
    if (c.get("organizationId")) {
      await next();
      return;
    }

    const user = c.get("user");
    const session = c.get("session");

    if (!user || !session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const active = session.activeOrganizationId;

    if (active) {
      const membership = await findMembership(c, user.id, active);

      if (membership) {
        c.set("organizationId", membership.organizationId);
        c.set("role", membership.role);
        await next();
        return;
      }
    }

    const fallback = await c.var.db
      .select({ organizationId: member.organizationId, role: member.role })
      .from(member)
      .where(eq(member.userId, user.id))
      .orderBy(member.createdAt)
      .limit(1);

    const first = fallback[0];

    if (!first || !isRoleName(first.role)) {
      return c.json({ error: "No organization membership" }, 403);
    }

    await c.var.db
      .update(sessionTable)
      .set({ activeOrganizationId: first.organizationId })
      .where(eq(sessionTable.id, session.id));

    c.set("organizationId", first.organizationId);
    c.set("role", first.role);
    await next();
  };
}

/** Admits the role and every role above it. Runs after organizationGuard. */
export function requireRole(minimum: RoleName): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const role = c.get("role");

    if (!role) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!roleAtLeast(role, minimum)) {
      return c.json({ error: `This needs the ${minimum} role or higher` }, 403);
    }

    await next();
  };
}

/** Reads the id the guard proved. Throws when a route forgot the guard. */
export function organizationIdOf(c: Context<AppEnv>): string {
  const organizationId = c.get("organizationId");

  if (!organizationId) {
    throw new Error("organizationGuard did not run for this route");
  }

  return organizationId;
}

/** True when the caller's role is below the minimum. For checks inside a handler. */
export function roleBelow(c: Context<AppEnv>, minimum: RoleName): boolean {
  return !roleAtLeast(roleOf(c), minimum);
}

export function roleOf(c: Context<AppEnv>): RoleName {
  const role = c.get("role");

  if (!role) {
    throw new Error("organizationGuard did not run for this route");
  }

  return role;
}
