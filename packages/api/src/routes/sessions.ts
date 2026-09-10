import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A } from "@mobily/ts-belt";
import { and, eq, inArray } from "drizzle-orm";
import { csvCell } from "#src/lib/csv";
import { parsePass, verifyPass } from "#src/lib/member-pass";
import { organizationGuard, organizationIdOf, requireRole, roleBelow } from "#src/lib/org-access";
import { createQrToken, verifyQrToken } from "#src/lib/qr-token";
import { randomSecret } from "#src/lib/schedule";
import { acceptsCheckIns, statusForCheckIn, statusOf } from "#src/lib/session-status";
import {
  existingRecord,
  finalizeSession,
  findSession,
  isExpected,
  listSessions,
  personForUser,
  sessionRecords,
  settle,
  toSessionJson,
  upsertRecord,
} from "#src/lib/sessions";
import type { AppEnv } from "#src/types";

const { attendanceSession, sessionGroup, group, member } = schema;

const statusEnum = z.enum(["scheduled", "running", "done"]);
const attendanceEnum = z.enum(["present", "late", "excused", "absent"]);

const groupRef = z.object({ id: z.string(), name: z.string() });

const countsSchema = z.object({
  expected: z.number(),
  registered: z.number(),
  present: z.number(),
  late: z.number(),
  excused: z.number(),
  absent: z.number(),
});

const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  lateAfterMinutes: z.number(),
  opensBeforeMinutes: z.number(),
  allowWalkIns: z.boolean(),
  registrationOpen: z.boolean(),
  registrationLimit: z.number().nullable(),
  registrationCount: z.number(),
  openedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  scheduleId: z.string().nullable(),
  status: statusEnum,
  groups: z.array(groupRef),
  counts: countsSchema,
});

const recordSchema = z.object({
  personId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  identifier: z.string().nullable(),
  expected: z.boolean(),
  registered: z.boolean(),
  status: attendanceEnum.nullable(),
  method: z.string().nullable(),
  checkedInAt: z.string().nullable(),
  note: z.string().nullable(),
});

const checkInResult = z.object({
  status: attendanceEnum,
  checkedInAt: z.string(),
  /** The person already had a record; nothing changed. */
  already: z.boolean(),
  sessionTitle: z.string(),
  personName: z.string(),
});

const sessionInput = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  lateAfterMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .optional(),
  opensBeforeMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .optional(),
  allowWalkIns: z.boolean().optional(),
  registrationOpen: z.boolean().optional(),
  registrationLimit: z.number().int().min(1).max(100_000).nullable().optional(),
  groupIds: z.array(z.string()).max(100),
});

const errorSchema = z.object({ error: z.string() });
const idParam = z.object({ id: z.string() });

const unauthorized = {
  description: "No active session",
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
const badTimes = {
  description: "The end is not after the start",
  content: { "application/json": { schema: errorSchema } },
} as const;

const PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const listQuery = z.object({
  scope: z.enum(["upcoming", "past", "all"]).optional(),
  /** A piece of the title, any case. */
  q: z.string().trim().max(120).optional(),
  groupId: z.string().max(64).optional(),
  /** `nextCursor` from the previous page. Absent for the first page. */
  cursor: z.string().max(256).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

const sessionPage = z.object({
  items: z.array(sessionSchema),
  /** Pass it back as `cursor` for the next page. Null when this is the last page. */
  nextCursor: z.string().nullable(),
});

const listRoute = createRoute({
  method: "get",
  path: "/sessions",
  tags: ["sessions"],
  summary: "List sessions, one page at a time. Also spawns scheduled ones and closes ended ones",
  request: { query: listQuery },
  responses: {
    200: {
      description: "Upcoming sessions soonest first, past ones newest first",
      content: { "application/json": { schema: sessionPage } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const createRouteDef = createRoute({
  method: "post",
  path: "/sessions",
  tags: ["sessions"],
  summary: "Create a session",
  request: { body: { content: { "application/json": { schema: sessionInput } } } },
  responses: {
    201: { description: "The session", content: { "application/json": { schema: sessionSchema } } },
    400: badTimes,
    401: unauthorized,
    403: forbidden,
  },
});

const detailRoute = createRoute({
  method: "get",
  path: "/sessions/{id}",
  tags: ["sessions"],
  summary: "Read one session",
  request: { params: idParam },
  responses: {
    200: { description: "The session", content: { "application/json": { schema: sessionSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/sessions/{id}",
  tags: ["sessions"],
  summary: "Edit a session",
  request: {
    params: idParam,
    body: { content: { "application/json": { schema: sessionInput.partial() } } },
  },
  responses: {
    200: { description: "The session", content: { "application/json": { schema: sessionSchema } } },
    400: badTimes,
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const removeRoute = createRoute({
  method: "delete",
  path: "/sessions/{id}",
  tags: ["sessions"],
  summary: "Delete a session and its records",
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

const openRoute = createRoute({
  method: "post",
  path: "/sessions/{id}/open",
  tags: ["sessions"],
  summary: "Open check-in ahead of the window",
  request: { params: idParam },
  responses: {
    200: { description: "The session", content: { "application/json": { schema: sessionSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: { description: "Already done", content: { "application/json": { schema: errorSchema } } },
  },
});

const closeRoute = createRoute({
  method: "post",
  path: "/sessions/{id}/close",
  tags: ["sessions"],
  summary: "Close the session now and mark the missing as absent",
  request: { params: idParam },
  responses: {
    200: { description: "The session", content: { "application/json": { schema: sessionSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const recordsRoute = createRoute({
  method: "get",
  path: "/sessions/{id}/records",
  tags: ["sessions"],
  summary: "Everyone expected, and everyone with a record",
  request: { params: idParam },
  responses: {
    200: {
      description: "Records, by name",
      content: { "application/json": { schema: z.array(recordSchema) } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const setRecordRoute = createRoute({
  method: "put",
  path: "/sessions/{id}/records/{personId}",
  tags: ["sessions"],
  summary: "Set a person's status by hand",
  request: {
    params: idParam.extend({ personId: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            status: attendanceEnum,
            note: z.string().trim().max(500).nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "The record", content: { "application/json": { schema: recordSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const qrTokenRoute = createRoute({
  method: "get",
  path: "/sessions/{id}/qr-token",
  tags: ["sessions"],
  summary: "The rotating token for the room screen",
  request: { params: idParam },
  responses: {
    200: {
      description: "The token for the current time window",
      content: {
        "application/json": {
          schema: z.object({
            token: z.string(),
            expiresAt: z.string(),
            checkinPath: z.string(),
            status: statusEnum,
          }),
        },
      },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const checkInRoute = createRoute({
  method: "post",
  path: "/sessions/{id}/check-in",
  tags: ["sessions"],
  summary: "Check yourself in with the token from the room screen",
  description:
    "Any signed-in member of the session's organization. The token proves the reader saw the live screen; the account proves who they are.",
  request: {
    params: idParam,
    body: { content: { "application/json": { schema: z.object({ token: z.string().min(1) }) } } },
  },
  responses: {
    200: { description: "Checked in", content: { "application/json": { schema: checkInResult } } },
    401: {
      description: "No session, or the token expired",
      content: { "application/json": { schema: errorSchema } },
    },
    403: {
      description: "Not a member, not in the directory, or not expected",
      content: { "application/json": { schema: errorSchema } },
    },
    404: notFound,
    410: {
      description: "Check-in is not open",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const scanRoute = createRoute({
  method: "post",
  path: "/sessions/{id}/scan",
  tags: ["sessions"],
  summary: "Check someone in from the pass on their phone",
  request: {
    params: idParam,
    body: { content: { "application/json": { schema: z.object({ code: z.string().min(1) }) } } },
  },
  responses: {
    200: { description: "Checked in", content: { "application/json": { schema: checkInResult } } },
    400: {
      description: "Not a pass, or a pass for another session",
      content: { "application/json": { schema: errorSchema } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    410: {
      description: "Check-in is not open",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

function validTimes(startsAt: Date, endsAt: Date) {
  return endsAt.getTime() > startsAt.getTime();
}

async function validGroupIds(c: Parameters<typeof organizationIdOf>[0], ids: string[]) {
  const organizationId = organizationIdOf(c);
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return [];

  const rows = await c.var.db
    .select({ id: group.id })
    .from(group)
    .where(and(eq(group.organizationId, organizationId), inArray(group.id, wanted)));

  return A.map(rows, (row) => row.id);
}

const FORBIDDEN_MESSAGE = "This needs the organizer role or higher";

const app = new OpenAPIHono<AppEnv>();

// Reads and self check-in are for every member. Writes check the role inline.
app.use("/sessions", organizationGuard());
app.use("/sessions/*", organizationGuard());

export const sessionRoutes = app
  .openapi(listRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const query = c.req.valid("query");
    const now = new Date();

    await settle(c.var.db, organizationId, now);
    const page = await listSessions(c.var.db, {
      organizationId,
      scope: query.scope ?? "upcoming",
      q: query.q || undefined,
      groupId: query.groupId || undefined,
      cursor: query.cursor,
      limit: query.limit ?? PAGE_SIZE,
      now,
    });

    return c.json(
      { items: [...(await toSessionJson(c.var.db, page.items, now))], nextCursor: page.nextCursor },
      200,
    );
  })
  .openapi(createRouteDef, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    const body = c.req.valid("json");
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);

    if (!validTimes(startsAt, endsAt)) {
      return c.json({ error: "The event must end after it starts." }, 400);
    }

    const groupIds = await validGroupIds(c, body.groupIds);
    const id = crypto.randomUUID();

    await c.var.db.transaction(async (tx) => {
      await tx.insert(attendanceSession).values({
        id,
        organizationId,
        title: body.title,
        description: body.description?.trim() || null,
        startsAt,
        endsAt,
        lateAfterMinutes: body.lateAfterMinutes ?? 15,
        opensBeforeMinutes: body.opensBeforeMinutes ?? 15,
        allowWalkIns: body.allowWalkIns ?? false,
        registrationOpen: body.registrationOpen ?? false,
        registrationLimit: body.registrationLimit ?? null,
        secret: randomSecret(),
        createdBy: user?.id ?? null,
      });

      if (groupIds.length) {
        await tx
          .insert(sessionGroup)
          .values([...A.map(groupIds, (groupId) => ({ sessionId: id, groupId }))]);
      }
    });

    const created = await findSession(c.var.db, organizationId, id);
    if (!created) throw new Error("Insert returned no row");

    const [json] = await toSessionJson(c.var.db, [created]);
    return c.json(json, 201);
  })
  .openapi(detailRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const now = new Date();

    await settle(c.var.db, organizationId, now);
    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const [json] = await toSessionJson(c.var.db, [found], now);
    return c.json(json, 200);
  })
  .openapi(updateRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const startsAt = body.startsAt ? new Date(body.startsAt) : found.startsAt;
    const endsAt = body.endsAt ? new Date(body.endsAt) : found.endsAt;

    if (!validTimes(startsAt, endsAt)) {
      return c.json({ error: "The event must end after it starts." }, 400);
    }

    const groupIds = body.groupIds ? await validGroupIds(c, body.groupIds) : null;

    await c.var.db.transaction(async (tx) => {
      await tx
        .update(attendanceSession)
        .set({
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined
            ? { description: body.description?.trim() || null }
            : {}),
          startsAt,
          endsAt,
          ...(body.lateAfterMinutes !== undefined
            ? { lateAfterMinutes: body.lateAfterMinutes }
            : {}),
          ...(body.opensBeforeMinutes !== undefined
            ? { opensBeforeMinutes: body.opensBeforeMinutes }
            : {}),
          ...(body.allowWalkIns !== undefined ? { allowWalkIns: body.allowWalkIns } : {}),
          ...(body.registrationOpen !== undefined
            ? { registrationOpen: body.registrationOpen }
            : {}),
          ...(body.registrationLimit !== undefined
            ? { registrationLimit: body.registrationLimit }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(attendanceSession.id, id));

      if (groupIds) {
        await tx.delete(sessionGroup).where(eq(sessionGroup.sessionId, id));
        if (groupIds.length) {
          await tx
            .insert(sessionGroup)
            .values([...A.map(groupIds, (groupId) => ({ sessionId: id, groupId }))]);
        }
      }
    });

    const updated = await findSession(c.var.db, organizationId, id);
    if (!updated) throw new Error("Update returned no row");

    const [json] = await toSessionJson(c.var.db, [updated]);
    return c.json(json, 200);
  })
  .openapi(removeRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: "This needs the admin role or higher" }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    await c.var.db.delete(attendanceSession).where(eq(attendanceSession.id, id));

    return c.json({ deleted: true as const }, 200);
  })
  .openapi(openRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const now = new Date();

    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);
    if (statusOf(found, now) === "done") {
      return c.json({ error: "This event is over." }, 409);
    }

    if (!found.openedAt) {
      await c.var.db
        .update(attendanceSession)
        .set({ openedAt: now, updatedAt: now })
        .where(eq(attendanceSession.id, id));
    }

    const updated = await findSession(c.var.db, organizationId, id);
    if (!updated) throw new Error("Update returned no row");

    const [json] = await toSessionJson(c.var.db, [updated], now);
    return c.json(json, 200);
  })
  .openapi(closeRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const now = new Date();

    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    if (!found.closedAt) {
      await finalizeSession(c.var.db, found, now < found.endsAt ? now : found.endsAt);
    }

    const updated = await findSession(c.var.db, organizationId, id);
    if (!updated) throw new Error("Update returned no row");

    const [json] = await toSessionJson(c.var.db, [updated], now);
    return c.json(json, 200);
  })
  .openapi(recordsRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    await settle(c.var.db, organizationId);
    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    return c.json([...(await sessionRecords(c.var.db, id))], 200);
  })
  .openapi(setRecordRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id, personId } = c.req.valid("param");
    const { status, note } = c.req.valid("json");
    const user = c.get("user");

    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const people = await c.var.db
      .select({ id: schema.person.id })
      .from(schema.person)
      .where(and(eq(schema.person.id, personId), eq(schema.person.organizationId, organizationId)))
      .limit(1);
    if (!people[0]) return c.json({ error: "Not found" }, 404);

    const current = await existingRecord(c.var.db, id, personId);
    const checkedInAt =
      status === "present" || status === "late" ? (current?.checkedInAt ?? new Date()) : null;

    await upsertRecord(c.var.db, {
      sessionId: id,
      personId,
      status,
      method: "manual",
      checkedInAt,
      note: note ?? null,
      markedBy: user?.id ?? null,
    });

    const rows = await sessionRecords(c.var.db, id);
    const record = A.getBy(rows, (row) => row.personId === personId);
    if (!record) throw new Error("Record vanished");

    return c.json(record, 200);
  })
  .openapi(qrTokenRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const now = new Date();

    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const { token, expiresAt } = await createQrToken({ secret: found.secret, sessionId: id, now });

    return c.json(
      {
        token,
        expiresAt: expiresAt.toISOString(),
        checkinPath: `/a/${id}?t=${token}`,
        status: statusOf(found, now),
      },
      200,
    );
  })
  .openapi(checkInRoute, async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const { token } = c.req.valid("json");
    const now = new Date();

    if (!user) return c.json({ error: "Unauthorized" }, 401);

    // The scanned link may point at a session of another organization the
    // reader belongs to, so membership is checked on the session's own.
    const rows = await c.var.db
      .select()
      .from(attendanceSession)
      .where(eq(attendanceSession.id, id))
      .limit(1);
    const found = rows[0];
    if (!found) return c.json({ error: "Not found" }, 404);

    const memberships = await c.var.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.organizationId, found.organizationId), eq(member.userId, user.id)))
      .limit(1);
    if (!memberships[0]) {
      return c.json({ error: "You are not a member of this organization." }, 403);
    }

    const valid = await verifyQrToken({ secret: found.secret, sessionId: id, token, now });
    if (!valid) return c.json({ error: "The QR code expired. Scan the screen again." }, 401);

    if (!acceptsCheckIns(found, now)) {
      return c.json({ error: "Check-in is not open for this event." }, 410);
    }

    const me = await personForUser(c.var.db, found.organizationId, user.id);
    if (!me) return c.json({ error: "You are not in this organization's directory yet." }, 403);

    const expected = await isExpected(c.var.db, id, me.id);
    if (!expected && !found.allowWalkIns) {
      return c.json({ error: "You are not on the list for this event." }, 403);
    }

    const current = await existingRecord(c.var.db, id, me.id);
    if (current?.checkedInAt) {
      return c.json(
        {
          status: current.status,
          checkedInAt: current.checkedInAt.toISOString(),
          already: true,
          sessionTitle: found.title,
          personName: me.name,
        },
        200,
      );
    }

    const record = await upsertRecord(c.var.db, {
      sessionId: id,
      personId: me.id,
      status: statusForCheckIn(found, now),
      method: "screen",
      checkedInAt: now,
    });

    return c.json(
      {
        status: record.status,
        checkedInAt: now.toISOString(),
        already: false,
        sessionTitle: found.title,
        personName: me.name,
      },
      200,
    );
  })
  .openapi(scanRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const { code } = c.req.valid("json");
    const now = new Date();

    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const pass = parsePass(code.trim());
    if (!pass) return c.json({ error: "That is not an absqir pass." }, 400);
    if (pass.sessionId !== id) return c.json({ error: "This pass is for another event." }, 400);
    if (!(await verifyPass(found.secret, pass))) {
      return c.json({ error: "This pass does not check out." }, 400);
    }

    if (!acceptsCheckIns(found, now)) {
      return c.json({ error: "Check-in is not open for this event." }, 410);
    }

    const people = await c.var.db
      .select({ id: schema.person.id, name: schema.person.name })
      .from(schema.person)
      .where(
        and(eq(schema.person.id, pass.personId), eq(schema.person.organizationId, organizationId)),
      )
      .limit(1);
    const who = people[0];
    if (!who) return c.json({ error: "Not found" }, 404);

    const current = await existingRecord(c.var.db, id, who.id);
    if (current?.checkedInAt) {
      return c.json(
        {
          status: current.status,
          checkedInAt: current.checkedInAt.toISOString(),
          already: true,
          sessionTitle: found.title,
          personName: who.name,
        },
        200,
      );
    }

    const record = await upsertRecord(c.var.db, {
      sessionId: id,
      personId: who.id,
      status: statusForCheckIn(found, now),
      method: "scanner",
      checkedInAt: now,
    });

    return c.json(
      {
        status: record.status,
        checkedInAt: now.toISOString(),
        already: false,
        sessionTitle: found.title,
        personName: who.name,
      },
      200,
    );
  })
  .get("/sessions/:id/records.csv", async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const id = c.req.param("id");

    const found = await findSession(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const records = await sessionRecords(c.var.db, id);

    const lines = [
      "name,email,identifier,status,checked_in_at,method,note",
      ...A.map(records, (row) =>
        [
          csvCell(row.name),
          csvCell(row.email ?? ""),
          csvCell(row.identifier ?? ""),
          row.status ?? "",
          row.checkedInAt ?? "",
          row.method ?? "",
          csvCell(row.note ?? ""),
        ].join(","),
      ),
    ];

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="attendance-${id}.csv"`);

    return c.body(lines.join("\n"));
  });

export { requireRole };
