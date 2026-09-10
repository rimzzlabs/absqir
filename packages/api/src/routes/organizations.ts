import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, eq, gt } from "drizzle-orm";
import { organizationGuard, organizationIdOf, roleOf } from "#src/lib/org-access";
import type { AppEnv } from "#src/types";

const { organization, member, person, group, invitation } = schema;

const currentSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  createdAt: z.string(),
  role: z.enum(["owner", "admin", "organizer", "member"]),
  counts: z.object({
    members: z.number(),
    people: z.number(),
    groups: z.number(),
    pendingInvitations: z.number(),
  }),
});

const errorSchema = z.object({ error: z.string() });

const currentRoute = createRoute({
  method: "get",
  path: "/organizations/current",
  tags: ["organizations"],
  summary: "The active organization, the caller's role, and a few counts",
  responses: {
    200: {
      description: "The organization",
      content: { "application/json": { schema: currentSchema } },
    },
    401: {
      description: "No active session",
      content: { "application/json": { schema: errorSchema } },
    },
    403: {
      description: "No organization membership",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const app = new OpenAPIHono<AppEnv>();

app.use("/organizations/*", organizationGuard());

export const organizationRoutes = app.openapi(currentRoute, async (c) => {
  const organizationId = organizationIdOf(c);
  const db = c.var.db;

  const [rows, members, people, groups, invitations] = await Promise.all([
    db.select().from(organization).where(eq(organization.id, organizationId)).limit(1),
    db.select({ value: count() }).from(member).where(eq(member.organizationId, organizationId)),
    db.select({ value: count() }).from(person).where(eq(person.organizationId, organizationId)),
    db.select({ value: count() }).from(group).where(eq(group.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, organizationId),
          eq(invitation.status, "pending"),
          gt(invitation.expiresAt, new Date()),
        ),
      ),
  ]);

  const found = rows[0];
  if (!found) return c.json({ error: "No organization membership" }, 403);

  return c.json(
    {
      id: found.id,
      name: found.name,
      slug: found.slug,
      logo: found.logo ?? null,
      createdAt: found.createdAt.toISOString(),
      role: roleOf(c),
      counts: {
        members: members[0]?.value ?? 0,
        people: people[0]?.value ?? 0,
        groups: groups[0]?.value ?? 0,
        pendingInvitations: invitations[0]?.value ?? 0,
      },
    },
    200,
  );
});
