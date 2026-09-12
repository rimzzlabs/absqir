import { authErrorOf, isRoleName } from "@absqir/auth";
import { type Database, schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A, F, pipe } from "@mobily/ts-belt";
import { and, asc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";
import type { Context } from "hono";
import { csvToRecords } from "#src/lib/csv";
import { organizationGuard, organizationIdOf, requireRole, roleBelow } from "#src/lib/org-access";
import type { AppEnv } from "#src/types";

const { person, member, group, groupMember, invitation } = schema;

const MAX_ROWS = 500;
const MAX_IMPORT_ROWS = 1000;

const roleSchema = z.enum(["owner", "admin", "organizer", "member"]);
const invitableRole = z.enum(["admin", "organizer", "member"]);

const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  identifier: z.string().nullable(),
  /** Set once the person has an account in this organization. */
  userId: z.string().nullable(),
  role: roleSchema.nullable(),
  /** A pending invitation waits for this email. */
  invited: z.boolean(),
  groups: z.array(z.object({ id: z.string(), name: z.string() })),
  createdAt: z.string(),
});

const personInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254).nullable().optional(),
  identifier: z.string().trim().max(60).nullable().optional(),
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
  description: "The email or identifier is already in the directory",
  content: { "application/json": { schema: errorSchema } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/people",
  tags: ["people"],
  summary: "List the directory of the active organization",
  request: { query: z.object({ q: z.string().trim().max(120).optional() }) },
  responses: {
    200: {
      description: "People, by name",
      content: { "application/json": { schema: z.array(personSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const createRouteDef = createRoute({
  method: "post",
  path: "/people",
  tags: ["people"],
  summary: "Add a person, and invite them when asked",
  request: {
    body: {
      content: {
        "application/json": {
          schema: personInput.extend({
            invite: z.boolean().optional(),
            role: invitableRole.optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "The person", content: { "application/json": { schema: personSchema } } },
    400: {
      description: "An invitation needs an email",
      content: { "application/json": { schema: errorSchema } },
    },
    401: unauthorized,
    403: forbidden,
    409: conflict,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/people/{id}",
  tags: ["people"],
  summary: "Edit a person",
  request: {
    params: idParam,
    body: { content: { "application/json": { schema: personInput.partial() } } },
  },
  responses: {
    200: { description: "The person", content: { "application/json": { schema: personSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: conflict,
  },
});

const removeRoute = createRoute({
  method: "delete",
  path: "/people/{id}",
  tags: ["people"],
  summary: "Remove a person from the directory and from the organization",
  request: { params: idParam },
  responses: {
    200: {
      description: "Gone",
      content: { "application/json": { schema: z.object({ deleted: z.literal(true) }) } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: {
      description: "The owner cannot be removed",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const inviteRoute = createRoute({
  method: "post",
  path: "/people/{id}/invite",
  tags: ["people"],
  summary: "Send or resend the invitation for a person",
  request: {
    params: idParam,
    body: { content: { "application/json": { schema: z.object({ role: invitableRole }) } } },
  },
  responses: {
    200: { description: "Sent", content: { "application/json": { schema: personSchema } } },
    400: {
      description: "No email on file",
      content: { "application/json": { schema: errorSchema } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const importRoute = createRoute({
  method: "post",
  path: "/people/import",
  tags: ["people"],
  summary: "Import a CSV with name, email, identifier columns",
  description:
    "The first row names the columns. `name` is required; `email` and `identifier` are optional. A row whose email or identifier is already in the directory updates that person. With `invite`, every row with an email gets an invitation.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            csv: z.string().min(1),
            invite: z.boolean().optional(),
            role: invitableRole.optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "What happened per row",
      content: {
        "application/json": {
          schema: z.object({
            created: z.number(),
            updated: z.number(),
            invited: z.number(),
            skipped: z.array(z.object({ row: z.number(), reason: z.string() })),
          }),
        },
      },
    },
    400: {
      description: "No name column",
      content: { "application/json": { schema: errorSchema } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

type PersonRow = typeof person.$inferSelect;

function normalizeEmail(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function normalizeIdentifier(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

interface Decorations {
  roles: Map<string, string>;
  invited: Set<string>;
  groups: Map<string, { id: string; name: string }[]>;
}

async function decorate(
  db: Database,
  organizationId: string,
  rows: PersonRow[],
): Promise<Decorations> {
  const userIds = A.flatMap(rows, (row) => (row.userId ? [row.userId] : []));
  const emails = A.flatMap(rows, (row) => (row.email ? [row.email] : []));
  const ids = A.map(rows, (row) => row.id);

  const [members, invitations, memberships] = await Promise.all([
    userIds.length
      ? db
          .select({ userId: member.userId, role: member.role })
          .from(member)
          .where(and(eq(member.organizationId, organizationId), inArray(member.userId, userIds)))
      : [],
    emails.length
      ? db
          .select({ email: invitation.email })
          .from(invitation)
          .where(
            and(
              eq(invitation.organizationId, organizationId),
              eq(invitation.status, "pending"),
              gt(invitation.expiresAt, new Date()),
              inArray(invitation.email, emails),
            ),
          )
      : [],
    ids.length
      ? db
          .select({ personId: groupMember.personId, id: group.id, name: group.name })
          .from(groupMember)
          .innerJoin(group, eq(group.id, groupMember.groupId))
          .where(inArray(groupMember.personId, ids))
          .orderBy(asc(group.name))
      : [],
  ]);

  const groups = new Map<string, { id: string; name: string }[]>();
  for (const row of memberships) {
    const list = groups.get(row.personId) ?? [];
    list.push({ id: row.id, name: row.name });
    groups.set(row.personId, list);
  }

  return {
    roles: new Map(A.map(members, (row) => [row.userId, row.role])),
    invited: new Set(A.map(invitations, (row) => row.email)),
    groups,
  };
}

function toJson(row: PersonRow, extra: Decorations) {
  const rawRole = row.userId ? extra.roles.get(row.userId) : undefined;
  const role = rawRole !== undefined && isRoleName(rawRole) ? rawRole : null;

  return {
    id: row.id,
    name: row.name,
    email: row.email ?? null,
    identifier: row.identifier ?? null,
    userId: row.userId ?? null,
    role,
    invited: row.email ? extra.invited.has(row.email) : false,
    groups: extra.groups.get(row.id) ?? [],
    createdAt: row.createdAt.toISOString(),
  };
}

async function findPerson(db: Database, organizationId: string, id: string) {
  const rows = await db
    .select()
    .from(person)
    .where(and(eq(person.id, id), eq(person.organizationId, organizationId)))
    .limit(1);

  return rows[0] ?? null;
}

async function one(c: Context<AppEnv>, row: PersonRow) {
  const extra = await decorate(c.var.db, row.organizationId, [row]);
  return toJson(row, extra);
}

async function invite(c: Context<AppEnv>, email: string, role: string) {
  await c.var.auth.api.createInvitation({
    body: { email, role: role as "member", organizationId: organizationIdOf(c) },
    headers: c.req.raw.headers,
  });
}

const app = new OpenAPIHono<AppEnv>();

app.use("/people", organizationGuard());
app.use("/people/*", organizationGuard());
app.use("/people", requireRole("organizer"));
app.use("/people/*", requireRole("organizer"));

export const peopleRoutes = app
  .openapi(listRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { q } = c.req.valid("query");
    const needle = q ? `%${q.replaceAll(/[%_]/g, "")}%` : null;

    const rows = await c.var.db
      .select()
      .from(person)
      .where(
        and(
          eq(person.organizationId, organizationId),
          needle
            ? or(
                ilike(person.name, needle),
                ilike(person.email, needle),
                ilike(person.identifier, needle),
              )
            : undefined,
        ),
      )
      .orderBy(asc(sql`lower(${person.name})`))
      .limit(MAX_ROWS);

    const extra = await decorate(c.var.db, organizationId, rows);

    return c.json(
      pipe(
        rows,
        A.map((row) => toJson(row, extra)),
        F.toMutable,
      ),
      200,
    );
  })
  .openapi(createRouteDef, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const body = c.req.valid("json");
    const email = normalizeEmail(body.email);
    const identifier = normalizeIdentifier(body.identifier);

    if (body.invite && !email) {
      return c.json({ error: "An invitation needs an email address." }, 400);
    }

    let created: PersonRow | undefined;

    try {
      [created] = await c.var.db
        .insert(person)
        .values({ id: crypto.randomUUID(), organizationId, name: body.name, email, identifier })
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ error: "Someone with that email or identifier is already listed." }, 409);
      }
      throw error;
    }

    if (!created) throw new Error("Insert returned no row");

    if (body.invite && email) {
      await invite(c, email, body.role ?? "member");
    }

    return c.json(await one(c, created), 201);
  })
  .openapi(updateRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const found = await findPerson(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    try {
      const [updated] = await c.var.db
        .update(person)
        .set({
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.email !== undefined ? { email: normalizeEmail(body.email) } : {}),
          ...(body.identifier !== undefined
            ? { identifier: normalizeIdentifier(body.identifier) }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(person.id, id))
        .returning();

      if (!updated) throw new Error("Update returned no row");

      return c.json(await one(c, updated), 200);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ error: "Someone with that email or identifier is already listed." }, 409);
      }
      throw error;
    }
  })
  .openapi(removeRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const found = await findPerson(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    if (found.userId) {
      const memberships = await c.var.db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(and(eq(member.organizationId, organizationId), eq(member.userId, found.userId)))
        .limit(1);

      const membership = memberships[0];

      if (membership?.role === "owner") {
        return c.json({ error: "The owner cannot be removed. Transfer ownership first." }, 409);
      }

      if (membership) {
        await c.var.db.delete(member).where(eq(member.id, membership.id));
      }
    }

    await c.var.db.delete(person).where(eq(person.id, id));

    return c.json({ deleted: true as const }, 200);
  })
  .openapi(inviteRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const { role } = c.req.valid("json");

    const found = await findPerson(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);
    if (!found.email) return c.json({ error: "Add an email address first." }, 400);

    try {
      await invite(c, found.email, role);
    } catch (error) {
      const known = authErrorOf(error);
      if (!known) throw error;

      return c.json({ error: known.message }, 400);
    }

    return c.json(await one(c, found), 200);
  })
  .openapi(importRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const body = c.req.valid("json");
    const table = csvToRecords(body.csv);

    if (!table.header.includes("name")) {
      return c.json({ error: "The first row must name a `name` column." }, 400);
    }

    const records = table.records.slice(0, MAX_IMPORT_ROWS);
    const existing = await c.var.db
      .select({ id: person.id, email: person.email, identifier: person.identifier })
      .from(person)
      .where(eq(person.organizationId, organizationId));

    const byEmail = new Map(A.flatMap(existing, (row) => (row.email ? [[row.email, row.id]] : [])));
    const byIdentifier = new Map(
      A.flatMap(existing, (row) => (row.identifier ? [[row.identifier, row.id]] : [])),
    );

    let created = 0;
    let updated = 0;
    let invited = 0;
    const skipped: { row: number; reason: string }[] = [];

    for (const [index, record] of records.entries()) {
      const rowNumber = index + 2;
      const name = record.name?.trim() ?? "";
      const email = normalizeEmail(record.email);
      const identifier = normalizeIdentifier(record.identifier);

      if (!name) {
        skipped.push({ row: rowNumber, reason: "no name" });
        continue;
      }

      if (email && !z.email().safeParse(email).success) {
        skipped.push({ row: rowNumber, reason: `bad email ${email}` });
        continue;
      }

      const matchId = (email && byEmail.get(email)) || (identifier && byIdentifier.get(identifier));

      try {
        if (matchId) {
          await c.var.db
            .update(person)
            .set({
              name,
              ...(email ? { email } : {}),
              ...(identifier ? { identifier } : {}),
              updatedAt: new Date(),
            })
            .where(eq(person.id, matchId));
          updated += 1;
        } else {
          const id = crypto.randomUUID();
          await c.var.db.insert(person).values({ id, organizationId, name, email, identifier });
          if (email) byEmail.set(email, id);
          if (identifier) byIdentifier.set(identifier, id);
          created += 1;
        }
      } catch (error) {
        if (isUniqueViolation(error)) {
          skipped.push({ row: rowNumber, reason: "email or identifier clashes with another row" });
          continue;
        }
        throw error;
      }

      if (body.invite && email) {
        try {
          await invite(c, email, body.role ?? "member");
          invited += 1;
        } catch (error) {
          const known = authErrorOf(error);
          if (!known) throw error;
          skipped.push({ row: rowNumber, reason: `not invited: ${known.message}` });
        }
      }
    }

    return c.json({ created, updated, invited, skipped }, 200);
  });
