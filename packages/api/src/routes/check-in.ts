import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { verifyQrToken } from "@/lib/qr-token";
import type { AppEnv } from "@/types";

const { attendanceSession, attendanceRecord } = schema;

const checkInBodySchema = z.object({
  sessionId: z.string().min(1),
  token: z.string().min(1),
  name: z.string().min(1).max(120),
  identifier: z.string().min(1).max(60),
});

const checkInResultSchema = z.object({
  name: z.string(),
  identifier: z.string(),
  checkedInAt: z.string(),
});

const errorSchema = z.object({ error: z.string() });

const route = createRoute({
  method: "post",
  path: "/check-in",
  tags: ["attendance"],
  summary: "Check in with a scanned QR token",
  description: "Public. The rotating token proves the reader saw the live QR screen.",
  request: {
    body: { content: { "application/json": { schema: checkInBodySchema } } },
  },
  responses: {
    201: {
      description: "Checked in",
      content: { "application/json": { schema: checkInResultSchema } },
    },
    401: {
      description: "The token expired or never matched",
      content: { "application/json": { schema: errorSchema } },
    },
    404: {
      description: "No such session",
      content: { "application/json": { schema: errorSchema } },
    },
    409: {
      description: "This identifier already checked in",
      content: { "application/json": { schema: errorSchema } },
    },
    410: {
      description: "The session is closed",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

export const checkInRoutes = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  const body = c.req.valid("json");

  const rows = await c.var.db
    .select()
    .from(attendanceSession)
    .where(eq(attendanceSession.id, body.sessionId))
    .limit(1);

  const session = rows[0];

  if (!session) return c.json({ error: "Session not found" }, 404);
  if (!session.active) return c.json({ error: "Session is closed" }, 410);

  const valid = await verifyQrToken({
    secret: session.secret,
    sessionId: session.id,
    token: body.token,
  });

  if (!valid) return c.json({ error: "The QR code expired. Scan it again." }, 401);

  const [created] = await c.var.db
    .insert(attendanceRecord)
    .values({
      id: crypto.randomUUID(),
      sessionId: session.id,
      name: body.name.trim(),
      identifier: body.identifier.trim(),
    })
    .onConflictDoNothing({ target: [attendanceRecord.sessionId, attendanceRecord.identifier] })
    .returning();

  if (!created) return c.json({ error: "This identifier already checked in." }, 409);

  return c.json(
    {
      name: created.name,
      identifier: created.identifier,
      checkedInAt: created.checkedInAt.toISOString(),
    },
    201,
  );
});
