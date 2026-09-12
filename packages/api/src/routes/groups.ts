import { type Database, schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A } from "@mobily/ts-belt";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { organizationGuard, organizationIdOf, requireRole, roleBelow } from "#src/lib/org-access";
import type { AppEnv } from "#src/types";

const { group, groupMember, person } = schema;

const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  memberCount: z.number(),
  createdAt: z.string(),
});

const groupMemberSchema = z.object({
  personId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  identifier: z.string().nullable(),
});

const groupDetailSchema = groupSchema.extend({ members: z.array(groupMemberSchema) });

const groupInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable().optional(),
});

const errorSchema = z.object({ error: z.string() });
const FORBIDDEN_MESSAGE = "This needs the admin role or higher";
const idParam = z.object({ id: z.string() });

const unauthorized = {
  description: "No active event",
  content: { "application/json": { schema: errorSchema } },
} as const;
const forbidden = {
  description: "Not a member, or the role is too low",
  content: { "application/json": { schema: errorSchema } },
} as const;
const notFound = {
  description: "Not found, or owned by another organization",
  content: { "application/json": { schema: errorSchema } },
} as const;
const conflict = {
  description: "A group with that name exists",
  content: { "application/json": { schema: errorSchema } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/groups",
  tags: ["groups"],
  summary: "List the groups of the active organization",
  responses: {
    200: {
      description: "Groups, by name",
      content: { "application/json": { schema: z.array(groupSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const createRouteDef = createRoute({
  method: "post",
  path: "/groups",
  tags: ["groups"],
  summary: "Create a group",
  request: { body: { content: { "application/json": { schema: groupInput } } } },
  responses: {
    201: { description: "The group", content: { "application/json": { schema: groupSchema } } },
    401: unauthorized,
    403: forbidden,
    409: conflict,
  },
});

const detailRoute = createRoute({
  method: "get",
  path: "/groups/{id}",
  tags: ["groups"],
  summary: "Read a group and its people",
  request: { params: idParam },
  responses: {
    200: {
      description: "The group",
      content: { "application/json": { schema: groupDetailSchema } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/groups/{id}",
  tags: ["groups"],
  summary: "Rename or describe a group",
  request: {
    params: idParam,
    body: { content: { "application/json": { schema: groupInput.partial() } } },
  },
  responses: {
    200: { description: "The group", content: { "application/json": { schema: groupSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: conflict,
  },
});

const removeRoute = createRoute({
  method: "delete",
  path: "/groups/{id}",
  tags: ["groups"],
  summary: "Delete a group. Its people stay in the directory",
  request: { params: idParam },
  responses: {
    200: {
      description: "Gone",
      content: { "application/json": { schema: z.object({ deleted: z.literal(true) }) } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const setMembersRoute = createRoute({
  method: "put",
  path: "/groups/{id}/members",
  tags: ["groups"],
  summary: "Replace the people in a group",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.object({ personIds: z.array(z.string()).max(2000) }) },
      },
    },
  },
  responses: {
    200: {
      description: "The group",
      content: { "application/json": { schema: groupDetailSchema } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

type GroupRow = typeof group.$inferSelect;

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function toJson(row: GroupRow, memberCount: number) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    memberCount,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findGroup(db: Database, organizationId: string, id: string) {
  const rows = await db
    .select()
    .from(group)
    .where(and(eq(group.id, id), eq(group.organizationId, organizationId)))
    .limit(1);

  return rows[0] ?? null;
}

async function membersOf(db: Database, groupId: string) {
  const rows = await db
    .select({
      personId: person.id,
      name: person.name,
      email: person.email,
      identifier: person.identifier,
    })
    .from(groupMember)
    .innerJoin(person, eq(person.id, groupMember.personId))
    .where(eq(groupMember.groupId, groupId))
    .orderBy(asc(sql`lower(${person.name})`));

  return A.map(rows, (row) => ({
    ...row,
    email: row.email ?? null,
    identifier: row.identifier ?? null,
  }));
}

async function detail(db: Database, row: GroupRow) {
  const members = await membersOf(db, row.id);
  return { ...toJson(row, members.length), members: [...members] };
}

const app = new OpenAPIHono<AppEnv>();

app.use("/groups", organizationGuard());
app.use("/groups/*", organizationGuard());
app.use("/groups", requireRole("organizer"));
app.use("/groups/*", requireRole("organizer"));

export const groupRoutes = app
  .openapi(listRoute, async (c) => {
    const organizationId = organizationIdOf(c);

    const rows = await c.var.db
      .select({ row: group, memberCount: count(groupMember.personId) })
      .from(group)
      .leftJoin(groupMember, eq(groupMember.groupId, group.id))
      .where(eq(group.organizationId, organizationId))
      .groupBy(group.id)
      .orderBy(asc(sql`lower(${group.name})`));

    return c.json([...A.map(rows, ({ row, memberCount }) => toJson(row, memberCount))], 200);
  })
  .openapi(createRouteDef, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const body = c.req.valid("json");

    try {
      const [created] = await c.var.db
        .insert(group)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          name: body.name,
          description: body.description?.trim() || null,
        })
        .returning();

      if (!created) throw new Error("Insert returned no row");

      return c.json(toJson(created, 0), 201);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ error: "A group with that name exists." }, 409);
      }
      throw error;
    }
  })
  .openapi(detailRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const found = await findGroup(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    return c.json(await detail(c.var.db, found), 200);
  })
  .openapi(updateRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const found = await findGroup(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    try {
      const [updated] = await c.var.db
        .update(group)
        .set({
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined
            ? { description: body.description?.trim() || null }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(group.id, id))
        .returning();

      if (!updated) throw new Error("Update returned no row");

      const members = await membersOf(c.var.db, id);

      return c.json(toJson(updated, members.length), 200);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ error: "A group with that name exists." }, 409);
      }
      throw error;
    }
  })
  .openapi(removeRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const found = await findGroup(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    await c.var.db.delete(group).where(eq(group.id, id));

    return c.json({ deleted: true as const }, 200);
  })
  .openapi(setMembersRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const { personIds } = c.req.valid("json");

    const found = await findGroup(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    // Only people of this organization can join; ids from elsewhere are dropped.
    const wanted = [...new Set(personIds)];
    const valid = wanted.length
      ? await c.var.db
          .select({ id: person.id })
          .from(person)
          .where(and(eq(person.organizationId, organizationId), inArray(person.id, wanted)))
      : [];

    await c.var.db.transaction(async (tx) => {
      await tx.delete(groupMember).where(eq(groupMember.groupId, id));

      if (valid.length) {
        await tx
          .insert(groupMember)
          .values([...A.map(valid, (row) => ({ groupId: id, personId: row.id }))]);
      }
    });

    return c.json(await detail(c.var.db, found), 200);
  });
