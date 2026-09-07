import { schema } from "@absqir/db";
import { and, eq } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "@/types";

const { member, session: sessionTable } = schema;

/**
 * Resolves the caller's active organization, proves membership, and puts the
 * id on the context, so every handler behind it reads one variable instead
 * of repeating the guard. When the session carries no active organization,
 * or a stale one the caller has left, the guard falls back to the first
 * membership and writes it back to the session, so the account heals itself.
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
      const memberships = await c.var.db
        .select({ id: member.id })
        .from(member)
        .where(and(eq(member.userId, user.id), eq(member.organizationId, active)))
        .limit(1);

      if (memberships[0]) {
        c.set("organizationId", active);
        await next();
        return;
      }
    }

    const fallback = await c.var.db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, user.id))
      .orderBy(member.createdAt)
      .limit(1);

    const organizationId = fallback[0]?.organizationId;

    if (!organizationId) {
      return c.json({ error: "No organization membership" }, 403);
    }

    await c.var.db
      .update(sessionTable)
      .set({ activeOrganizationId: organizationId })
      .where(eq(sessionTable.id, session.id));

    c.set("organizationId", organizationId);
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
