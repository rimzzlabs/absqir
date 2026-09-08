import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { createPass } from "@/lib/member-pass";
import { organizationGuard, organizationIdOf } from "@/lib/org-access";
import { statusOf } from "@/lib/session-status";
import { findSession, isPast, personForUser, settle, toSessionJson } from "@/lib/sessions";
import type { AppEnv } from "@/types";

const { attendanceSession, sessionGroup, sessionRegistration, groupMember, attendanceRecord } =
  schema;

const attendanceEnum = z.enum(["present", "late", "excused", "absent"]);

const mySessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  lateAfterMinutes: z.number(),
  opensBeforeMinutes: z.number(),
  status: z.enum(["scheduled", "running", "done"]),
  groups: z.array(z.object({ id: z.string(), name: z.string() })),
  /** What my record says, if there is one. */
  record: z
    .object({
      status: attendanceEnum,
      checkedInAt: z.string().nullable(),
      method: z.string(),
    })
    .nullable(),
});

const historySchema = z.object({
  sessionId: z.string(),
  title: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: attendanceEnum,
  checkedInAt: z.string().nullable(),
  method: z.string(),
  note: z.string().nullable(),
});

const errorSchema = z.object({ error: z.string() });

const unauthorized = {
  description: "No active session",
  content: { "application/json": { schema: errorSchema } },
} as const;
const forbidden = {
  description: "No organization membership, or not in the directory",
  content: { "application/json": { schema: errorSchema } },
} as const;

const sessionsRoute = createRoute({
  method: "get",
  path: "/my/sessions",
  tags: ["me"],
  summary: "The sessions that expect me, from yesterday on",
  responses: {
    200: {
      description: "Soonest first",
      content: { "application/json": { schema: z.array(mySessionSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const passRoute = createRoute({
  method: "get",
  path: "/my/sessions/{id}/pass",
  tags: ["me"],
  summary: "The pass to show at the door, as text for a QR code",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "The pass",
      content: {
        "application/json": {
          schema: z.object({ code: z.string(), sessionTitle: z.string(), personName: z.string() }),
        },
      },
    },
    401: unauthorized,
    403: forbidden,
    404: {
      description: "No such session, or I am not expected",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const historyRoute = createRoute({
  method: "get",
  path: "/my/history",
  tags: ["me"],
  summary: "My past records, newest first",
  responses: {
    200: {
      description: "Records",
      content: { "application/json": { schema: z.array(historySchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_LIMIT = 200;

const app = new OpenAPIHono<AppEnv>();

app.use("/my", organizationGuard());
app.use("/my/*", organizationGuard());

export const myRoutes = app
  .openapi(sessionsRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const me = await personForUser(c.var.db, organizationId, user.id);
    if (!me) return c.json({ error: "You are not in the directory yet." }, 403);

    const now = new Date();
    await settle(c.var.db, organizationId, now);

    const since = new Date(now.getTime() - DAY_MS);

    // Expected through a group, or registered on the public page.
    const [fromGroups, fromRegistrations] = await Promise.all([
      c.var.db
        .selectDistinct({ session: attendanceSession })
        .from(attendanceSession)
        .innerJoin(sessionGroup, eq(sessionGroup.sessionId, attendanceSession.id))
        .innerJoin(groupMember, eq(groupMember.groupId, sessionGroup.groupId))
        .where(
          and(
            eq(attendanceSession.organizationId, organizationId),
            eq(groupMember.personId, me.id),
            gte(attendanceSession.endsAt, since),
          ),
        ),
      c.var.db
        .select({ session: attendanceSession })
        .from(attendanceSession)
        .innerJoin(sessionRegistration, eq(sessionRegistration.sessionId, attendanceSession.id))
        .where(
          and(
            eq(attendanceSession.organizationId, organizationId),
            eq(sessionRegistration.personId, me.id),
            gte(attendanceSession.endsAt, since),
          ),
        ),
    ]);

    const seen = new Set<string>();
    const sessions = [...fromGroups, ...fromRegistrations]
      .map((row) => row.session)
      .filter((row) => (seen.has(row.id) ? false : seen.add(row.id)))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    const ids = sessions.map((row) => row.id);

    const records = ids.length
      ? await c.var.db
          .select()
          .from(attendanceRecord)
          .where(
            and(eq(attendanceRecord.personId, me.id), inArray(attendanceRecord.sessionId, ids)),
          )
      : [];
    const byId = new Map(records.map((row) => [row.sessionId, row]));

    const json = await toSessionJson(c.var.db, sessions, now);

    return c.json(
      json.map((row) => {
        const record = byId.get(row.id);

        return {
          id: row.id,
          title: row.title,
          description: row.description,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          lateAfterMinutes: row.lateAfterMinutes,
          opensBeforeMinutes: row.opensBeforeMinutes,
          status: row.status,
          groups: row.groups,
          record: record
            ? {
                status: record.status,
                checkedInAt: record.checkedInAt?.toISOString() ?? null,
                method: record.method,
              }
            : null,
        };
      }),
      200,
    );
  })
  .openapi(passRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    const { id } = c.req.valid("param");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const me = await personForUser(c.var.db, organizationId, user.id);
    if (!me) return c.json({ error: "You are not in the directory yet." }, 403);

    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);
    if (statusOf(found) === "done") return c.json({ error: "This session is over." }, 404);

    const code = await createPass({ secret: found.secret, sessionId: id, personId: me.id });

    return c.json({ code, sessionTitle: found.title, personName: me.name }, 200);
  })
  .openapi(historyRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const me = await personForUser(c.var.db, organizationId, user.id);
    if (!me) return c.json({ error: "You are not in the directory yet." }, 403);

    const now = new Date();
    await settle(c.var.db, organizationId, now);

    const rows = await c.var.db
      .select({ record: attendanceRecord, session: attendanceSession })
      .from(attendanceRecord)
      .innerJoin(attendanceSession, eq(attendanceSession.id, attendanceRecord.sessionId))
      .where(
        and(
          eq(attendanceRecord.personId, me.id),
          eq(attendanceSession.organizationId, organizationId),
          isPast(now),
        ),
      )
      .orderBy(desc(attendanceSession.startsAt))
      .limit(HISTORY_LIMIT);

    return c.json(
      rows.map(({ record, session }) => ({
        sessionId: session.id,
        title: session.title,
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        status: record.status,
        checkedInAt: record.checkedInAt?.toISOString() ?? null,
        method: record.method,
        note: record.note ?? null,
      })),
      200,
    );
  });
