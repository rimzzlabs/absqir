import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, desc, eq } from "drizzle-orm";
import { csvCell } from "@/lib/csv";
import { organizationGuard, organizationIdOf } from "@/lib/org-access";
import { createQrToken } from "@/lib/qr-token";
import type { AppEnv } from "@/types";

const { attendanceSession, attendanceRecord } = schema;

const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
  recordCount: z.number(),
});

const recordSchema = z.object({
  id: z.string(),
  name: z.string(),
  identifier: z.string(),
  checkedInAt: z.string(),
});

const qrTokenSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  checkinPath: z.string(),
});

const errorSchema = z.object({ error: z.string() });

const idParam = z.object({ id: z.string() });

const unauthorized = {
  description: "No active session",
  content: { "application/json": { schema: errorSchema } },
} as const;

const forbidden = {
  description: "No organization membership",
  content: { "application/json": { schema: errorSchema } },
} as const;

const notFound = {
  description: "Not found, or owned by another organization",
  content: { "application/json": { schema: errorSchema } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/attendance-sessions",
  tags: ["attendance"],
  summary: "List the active organization's attendance sessions",
  responses: {
    200: {
      description: "The sessions, newest first",
      content: { "application/json": { schema: z.array(sessionSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const createSessionRoute = createRoute({
  method: "post",
  path: "/attendance-sessions",
  tags: ["attendance"],
  summary: "Create an attendance session in the active organization",
  request: {
    body: {
      content: {
        "application/json": { schema: z.object({ title: z.string().min(1).max(120) }) },
      },
    },
  },
  responses: {
    201: {
      description: "The created session",
      content: { "application/json": { schema: sessionSchema } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const detailRoute = createRoute({
  method: "get",
  path: "/attendance-sessions/{id}",
  tags: ["attendance"],
  summary: "Read one attendance session",
  request: { params: idParam },
  responses: {
    200: {
      description: "The session",
      content: { "application/json": { schema: sessionSchema } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const toggleRoute = createRoute({
  method: "patch",
  path: "/attendance-sessions/{id}",
  tags: ["attendance"],
  summary: "Open or close a session for check-ins",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: z.object({ active: z.boolean() }) } },
    },
  },
  responses: {
    200: {
      description: "The updated session",
      content: { "application/json": { schema: sessionSchema.omit({ recordCount: true }) } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const removeRoute = createRoute({
  method: "delete",
  path: "/attendance-sessions/{id}",
  tags: ["attendance"],
  summary: "Delete a session and its records",
  request: { params: idParam },
  responses: {
    200: {
      description: "The session is gone",
      content: { "application/json": { schema: z.object({ deleted: z.literal(true) }) } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const qrTokenRoute = createRoute({
  method: "get",
  path: "/attendance-sessions/{id}/qr-token",
  tags: ["attendance"],
  summary: "Read the current rotating QR token",
  request: { params: idParam },
  responses: {
    200: {
      description: "The token for the current time window",
      content: { "application/json": { schema: qrTokenSchema } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const recordsRoute = createRoute({
  method: "get",
  path: "/attendance-sessions/{id}/records",
  tags: ["attendance"],
  summary: "List the check-ins of a session",
  request: { params: idParam },
  responses: {
    200: {
      description: "The check-ins, newest first",
      content: { "application/json": { schema: z.array(recordSchema) } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

type SessionRow = typeof attendanceSession.$inferSelect;

interface FindOrgSessionParams {
  db: Database;
  id: string;
  organizationId: string;
}

async function findOrgSession(params: FindOrgSessionParams): Promise<SessionRow | null> {
  const rows = await params.db
    .select()
    .from(attendanceSession)
    .where(
      and(
        eq(attendanceSession.id, params.id),
        eq(attendanceSession.organizationId, params.organizationId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

interface CountedSessionRow {
  id: string;
  title: string;
  active: boolean;
  createdAt: Date;
  recordCount: number;
}

function sessionsWithCount(db: Database) {
  return db
    .select({
      id: attendanceSession.id,
      title: attendanceSession.title,
      active: attendanceSession.active,
      createdAt: attendanceSession.createdAt,
      recordCount: count(attendanceRecord.id),
    })
    .from(attendanceSession)
    .leftJoin(attendanceRecord, eq(attendanceRecord.sessionId, attendanceSession.id))
    .groupBy(attendanceSession.id);
}

function toSessionJson(row: CountedSessionRow) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

async function sessionRecords(db: Database, sessionId: string) {
  const rows = await db
    .select()
    .from(attendanceRecord)
    .where(eq(attendanceRecord.sessionId, sessionId))
    .orderBy(desc(attendanceRecord.checkedInAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    identifier: row.identifier,
    checkedInAt: row.checkedInAt.toISOString(),
  }));
}

const app = new OpenAPIHono<AppEnv>();

// Registered before the routes, off the chain: OpenAPIHono's use() returns a
// plain Hono type and would hide openapi() from the rest of the chain.
app.use("/attendance-sessions", organizationGuard());
app.use("/attendance-sessions/*", organizationGuard());

export const attendanceSessionRoutes = app
  .openapi(listRoute, async (c) => {
    const organizationId = organizationIdOf(c);

    const rows = await sessionsWithCount(c.var.db)
      .where(eq(attendanceSession.organizationId, organizationId))
      .orderBy(desc(attendanceSession.createdAt));

    return c.json(rows.map(toSessionJson), 200);
  })
  .openapi(createSessionRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { title } = c.req.valid("json");

    const secretBytes = crypto.getRandomValues(new Uint8Array(32));
    const secret = [...secretBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

    const [created] = await c.var.db
      .insert(attendanceSession)
      .values({ id: crypto.randomUUID(), title, secret, organizationId })
      .returning();

    if (!created) throw new Error("Insert returned no row");

    return c.json(toSessionJson({ ...created, recordCount: 0 }), 201);
  })
  .openapi(detailRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const rows = await sessionsWithCount(c.var.db).where(
      and(eq(attendanceSession.id, id), eq(attendanceSession.organizationId, organizationId)),
    );

    const found = rows[0];
    if (!found) return c.json({ error: "Not found" }, 404);

    return c.json(toSessionJson(found), 200);
  })
  .openapi(toggleRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const { active } = c.req.valid("json");

    const found = await findOrgSession({ db: c.var.db, id, organizationId });
    if (!found) return c.json({ error: "Not found" }, 404);

    const [updated] = await c.var.db
      .update(attendanceSession)
      .set({ active })
      .where(eq(attendanceSession.id, id))
      .returning();

    if (!updated) throw new Error("Update returned no row");

    return c.json(
      {
        id: updated.id,
        title: updated.title,
        active: updated.active,
        createdAt: updated.createdAt.toISOString(),
      },
      200,
    );
  })
  .openapi(removeRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const found = await findOrgSession({ db: c.var.db, id, organizationId });
    if (!found) return c.json({ error: "Not found" }, 404);

    await c.var.db.delete(attendanceSession).where(eq(attendanceSession.id, id));

    return c.json({ deleted: true as const }, 200);
  })
  .openapi(qrTokenRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const found = await findOrgSession({ db: c.var.db, id, organizationId });
    if (!found) return c.json({ error: "Not found" }, 404);

    const { token, expiresAt } = await createQrToken({ secret: found.secret, sessionId: id });

    return c.json(
      {
        token,
        expiresAt: expiresAt.toISOString(),
        checkinPath: `/a/${id}?t=${token}`,
      },
      200,
    );
  })
  .openapi(recordsRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const found = await findOrgSession({ db: c.var.db, id, organizationId });
    if (!found) return c.json({ error: "Not found" }, 404);

    return c.json(await sessionRecords(c.var.db, id), 200);
  })
  .get("/attendance-sessions/:id/records.csv", async (c) => {
    const organizationId = organizationIdOf(c);
    const id = c.req.param("id");

    const found = await findOrgSession({ db: c.var.db, id, organizationId });
    if (!found) return c.json({ error: "Not found" }, 404);

    const records = await sessionRecords(c.var.db, id);

    const lines = [
      "name,identifier,checked_in_at",
      ...records.map((row) =>
        [csvCell(row.name), csvCell(row.identifier), row.checkedInAt].join(","),
      ),
    ];

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="attendance-${id}.csv"`);

    return c.body(lines.join("\n"));
  });
