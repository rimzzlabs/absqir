import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, desc, eq } from "drizzle-orm";
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

const notFound = {
  description: "Not found, or owned by another user",
  content: { "application/json": { schema: errorSchema } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/attendance-sessions",
  tags: ["attendance"],
  summary: "List the signed-in user's attendance sessions",
  responses: {
    200: {
      description: "The sessions, newest first",
      content: { "application/json": { schema: z.array(sessionSchema) } },
    },
    401: unauthorized,
  },
});

const createSessionRoute = createRoute({
  method: "post",
  path: "/attendance-sessions",
  tags: ["attendance"],
  summary: "Create an attendance session",
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
    404: notFound,
  },
});

type OwnedSession = typeof attendanceSession.$inferSelect;

interface FindOwnedSessionParams {
  db: Database;
  id: string;
  ownerId: string;
}

async function findOwnedSession(params: FindOwnedSessionParams): Promise<OwnedSession | null> {
  const rows = await params.db
    .select()
    .from(attendanceSession)
    .where(and(eq(attendanceSession.id, params.id), eq(attendanceSession.ownerId, params.ownerId)))
    .limit(1);

  return rows[0] ?? null;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export const attendanceSessionRoutes = new OpenAPIHono<AppEnv>()
  .openapi(listRoute, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const rows = await c.var.db
      .select({
        id: attendanceSession.id,
        title: attendanceSession.title,
        active: attendanceSession.active,
        createdAt: attendanceSession.createdAt,
        recordCount: count(attendanceRecord.id),
      })
      .from(attendanceSession)
      .leftJoin(attendanceRecord, eq(attendanceRecord.sessionId, attendanceSession.id))
      .where(eq(attendanceSession.ownerId, user.id))
      .groupBy(attendanceSession.id)
      .orderBy(desc(attendanceSession.createdAt));

    return c.json(
      rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      200,
    );
  })
  .openapi(createSessionRoute, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { title } = c.req.valid("json");

    const secretBytes = crypto.getRandomValues(new Uint8Array(32));
    const secret = [...secretBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

    const [created] = await c.var.db
      .insert(attendanceSession)
      .values({ id: crypto.randomUUID(), title, secret, ownerId: user.id })
      .returning();

    if (!created) throw new Error("Insert returned no row");

    return c.json(
      {
        id: created.id,
        title: created.title,
        active: created.active,
        createdAt: created.createdAt.toISOString(),
        recordCount: 0,
      },
      201,
    );
  })
  .openapi(toggleRoute, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { id } = c.req.valid("param");
    const { active } = c.req.valid("json");

    const owned = await findOwnedSession({ db: c.var.db, id, ownerId: user.id });
    if (!owned) return c.json({ error: "Not found" }, 404);

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
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { id } = c.req.valid("param");

    const owned = await findOwnedSession({ db: c.var.db, id, ownerId: user.id });
    if (!owned) return c.json({ error: "Not found" }, 404);

    await c.var.db.delete(attendanceSession).where(eq(attendanceSession.id, id));

    return c.json({ deleted: true as const }, 200);
  })
  .openapi(qrTokenRoute, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { id } = c.req.valid("param");

    const owned = await findOwnedSession({ db: c.var.db, id, ownerId: user.id });
    if (!owned) return c.json({ error: "Not found" }, 404);

    const { token, expiresAt } = await createQrToken({ secret: owned.secret, sessionId: id });

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
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { id } = c.req.valid("param");

    const owned = await findOwnedSession({ db: c.var.db, id, ownerId: user.id });
    if (!owned) return c.json({ error: "Not found" }, 404);

    const rows = await c.var.db
      .select()
      .from(attendanceRecord)
      .where(eq(attendanceRecord.sessionId, id))
      .orderBy(desc(attendanceRecord.checkedInAt));

    return c.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        identifier: row.identifier,
        checkedInAt: row.checkedInAt.toISOString(),
      })),
      200,
    );
  })
  .get("/attendance-sessions/:id/records.csv", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");

    const owned = await findOwnedSession({ db: c.var.db, id, ownerId: user.id });
    if (!owned) return c.json({ error: "Not found" }, 404);

    const rows = await c.var.db
      .select()
      .from(attendanceRecord)
      .where(eq(attendanceRecord.sessionId, id))
      .orderBy(desc(attendanceRecord.checkedInAt));

    const lines = [
      "name,identifier,checked_in_at",
      ...rows.map((row) =>
        [csvCell(row.name), csvCell(row.identifier), row.checkedInAt.toISOString()].join(","),
      ),
    ];

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="attendance-${id}.csv"`);

    return c.body(lines.join("\n"));
  });
