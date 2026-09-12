import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A } from "@mobily/ts-belt";
import { and, desc, eq, lt, ne, or, sql } from "drizzle-orm";
import type { Context } from "hono";
import { decodeCursor, pageOf } from "#src/lib/cursor";
import { statusOf } from "#src/lib/event-status";
import { findEvent, isExpected, personForUser, upsertRecord } from "#src/lib/events";
import { deliver } from "#src/lib/notifications";
import { notifyLeaveDecided, notifyLeaveRequested } from "#src/lib/notify";
import { organizationGuard, organizationIdOf, roleBelow } from "#src/lib/org-access";
import type { AppEnv } from "#src/types";

const { leaveRequest, event: eventTable, person } = schema;

const leaveStatus = z.enum(["pending", "approved", "declined"]);

const leaveSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  personId: z.string(),
  personName: z.string(),
  reason: z.string(),
  status: leaveStatus,
  decisionNote: z.string().nullable(),
  decidedAt: z.string().nullable(),
  createdAt: z.string(),
});

const leavePage = z.object({
  items: z.array(leaveSchema),
  /** Pass it back as `cursor` for the next page. Null when this is the last page. */
  nextCursor: z.string().nullable(),
});

const errorSchema = z.object({ error: z.string() });
const idParam = z.object({ id: z.string() });

const PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const unauthorized = {
  description: "No active event",
  content: { "application/json": { schema: errorSchema } },
} as const;
const forbidden = {
  description: "Not a member, not in the directory, or the role is too low",
  content: { "application/json": { schema: errorSchema } },
} as const;
const notFound = {
  description: "Not found",
  content: { "application/json": { schema: errorSchema } },
} as const;

const mineRoute = createRoute({
  method: "get",
  path: "/my/leave",
  tags: ["leave"],
  summary: "My leave requests, newest first, one page at a time",
  description:
    "`pending` waits for a decision, `decided` has one. The page walks the (created_at, id) index, not an offset.",
  request: {
    query: z.object({
      status: z.enum(["pending", "decided", "all"]).optional(),
      cursor: z.string().max(256).optional(),
      limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
    }),
  },
  responses: {
    200: {
      description: "One page of requests",
      content: { "application/json": { schema: leavePage } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const askRoute = createRoute({
  method: "post",
  path: "/my/leave",
  tags: ["leave"],
  summary: "Ask to be excused from an event that expects me",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            eventId: z.string().min(1),
            reason: z.string().trim().min(1).max(500),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "The request", content: { "application/json": { schema: leaveSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: {
      description: "The event is over, I am not expected, or a request exists",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const withdrawRoute = createRoute({
  method: "delete",
  path: "/my/leave/{id}",
  tags: ["leave"],
  summary: "Withdraw a pending request",
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
      description: "Already decided",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const queueRoute = createRoute({
  method: "get",
  path: "/leave",
  tags: ["leave"],
  summary: "Leave requests of the organization",
  request: { query: z.object({ status: z.enum(["pending", "decided", "all"]).optional() }) },
  responses: {
    200: {
      description: "Requests",
      content: { "application/json": { schema: z.array(leaveSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const decideRoute = createRoute({
  method: "post",
  path: "/leave/{id}/decide",
  tags: ["leave"],
  summary: "Approve or decline. An approval writes an excused record",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            decision: z.enum(["approved", "declined"]),
            note: z.string().trim().max(500).nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "The request", content: { "application/json": { schema: leaveSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: {
      description: "Already decided",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

type Row = {
  request: typeof leaveRequest.$inferSelect;
  event: typeof eventTable.$inferSelect;
  personName: string;
};

function toJson(row: Row) {
  return {
    id: row.request.id,
    eventId: row.event.id,
    eventTitle: row.event.title,
    startsAt: row.event.startsAt.toISOString(),
    endsAt: row.event.endsAt.toISOString(),
    personId: row.request.personId,
    personName: row.personName,
    reason: row.request.reason,
    status: row.request.status,
    decisionNote: row.request.decisionNote ?? null,
    decidedAt: row.request.decidedAt?.toISOString() ?? null,
    createdAt: row.request.createdAt.toISOString(),
  };
}

const base = new OpenAPIHono<AppEnv>();

base.use("/my/leave", organizationGuard());
base.use("/my/leave/*", organizationGuard());
base.use("/leave", organizationGuard());
base.use("/leave/*", organizationGuard());

/** Postgres keeps microseconds, so the cursor carries the column as text. */
const createdAtText = sql<string>`${leaveRequest.createdAt}::text`;

const byScope = {
  pending: eq(leaveRequest.status, "pending"),
  decided: ne(leaveRequest.status, "pending"),
  all: undefined,
};

function rows(c: Context<AppEnv>) {
  return c.var.db
    .select({
      request: leaveRequest,
      event: eventTable,
      personName: person.name,
      at: createdAtText,
    })
    .from(leaveRequest)
    .innerJoin(eventTable, eq(eventTable.id, leaveRequest.eventId))
    .innerJoin(person, eq(person.id, leaveRequest.personId));
}

export const leaveRoutes = base
  .openapi(mineRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const me = await personForUser(c.var.db, organizationId, user.id);
    if (!me) return c.json({ error: "You are not in the directory yet." }, 403);

    const query = c.req.valid("query");
    const limit = query.limit ?? PAGE_SIZE;
    const cursor = decodeCursor(query.cursor);

    const after = cursor
      ? or(
          lt(leaveRequest.createdAt, sql`${cursor.at}::timestamptz`),
          and(
            eq(leaveRequest.createdAt, sql`${cursor.at}::timestamptz`),
            lt(leaveRequest.id, cursor.id),
          ),
        )
      : undefined;

    const list = await rows(c)
      .where(
        and(
          eq(leaveRequest.organizationId, organizationId),
          eq(leaveRequest.personId, me.id),
          byScope[query.status ?? "all"],
          after,
        ),
      )
      .orderBy(desc(leaveRequest.createdAt), desc(leaveRequest.id))
      .limit(limit + 1);

    const page = pageOf(list, limit, (row) => ({ at: row.at, id: row.request.id }));

    return c.json({ items: [...A.map(page.items, toJson)], nextCursor: page.nextCursor }, 200);
  })
  .openapi(askRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    const { eventId, reason } = c.req.valid("json");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const me = await personForUser(c.var.db, organizationId, user.id);
    if (!me) return c.json({ error: "You are not in the directory yet." }, 403);

    const event = await findEvent(c.var.db, organizationId, eventId);
    if (!event) return c.json({ error: "Not found" }, 404);
    if (statusOf(event) === "done") return c.json({ error: "This event is over." }, 409);
    if (!(await isExpected(c.var.db, eventId, me.id))) {
      return c.json({ error: "You are not expected at this event." }, 409);
    }

    const existing = await c.var.db
      .select({ id: leaveRequest.id })
      .from(leaveRequest)
      .where(and(eq(leaveRequest.eventId, eventId), eq(leaveRequest.personId, me.id)))
      .limit(1);
    if (existing[0]) {
      return c.json({ error: "You already asked for leave from this event." }, 409);
    }

    const id = crypto.randomUUID();

    await c.var.db.insert(leaveRequest).values({
      id,
      organizationId,
      eventId,
      personId: me.id,
      reason,
    });

    const [created] = await rows(c).where(eq(leaveRequest.id, id)).limit(1);
    if (!created) throw new Error("Insert returned no row");

    deliver(
      c,
      await notifyLeaveRequested(c.var.db, {
        organizationId,
        requestId: id,
        personName: me.name,
        eventTitle: event.title,
        reason,
      }),
    );

    return c.json(toJson(created), 201);
  })
  .openapi(withdrawRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    const { id } = c.req.valid("param");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const me = await personForUser(c.var.db, organizationId, user.id);
    if (!me) return c.json({ error: "You are not in the directory yet." }, 403);

    const found = await c.var.db
      .select()
      .from(leaveRequest)
      .where(and(eq(leaveRequest.id, id), eq(leaveRequest.personId, me.id)))
      .limit(1);
    const request = found[0];
    if (!request) return c.json({ error: "Not found" }, 404);
    if (request.status !== "pending") return c.json({ error: "Already decided." }, 409);

    await c.var.db.delete(leaveRequest).where(eq(leaveRequest.id, id));

    return c.json({ deleted: true as const }, 200);
  })
  .openapi(queueRoute, async (c) => {
    if (roleBelow(c, "organizer")) {
      return c.json({ error: "This needs the organizer role or higher" }, 403);
    }

    const organizationId = organizationIdOf(c);
    const { status } = c.req.valid("query");
    const scope = status ?? "pending";

    const list = await rows(c)
      .where(and(eq(leaveRequest.organizationId, organizationId), byScope[scope]))
      .orderBy(desc(leaveRequest.createdAt));

    return c.json([...A.map(list, toJson)], 200);
  })
  .openapi(decideRoute, async (c) => {
    if (roleBelow(c, "organizer")) {
      return c.json({ error: "This needs the organizer role or higher" }, 403);
    }

    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const { decision, note } = c.req.valid("json");

    const found = await rows(c)
      .where(and(eq(leaveRequest.id, id), eq(leaveRequest.organizationId, organizationId)))
      .limit(1);
    const row = found[0];
    if (!row) return c.json({ error: "Not found" }, 404);
    if (row.request.status !== "pending") return c.json({ error: "Already decided." }, 409);

    const now = new Date();

    await c.var.db
      .update(leaveRequest)
      .set({
        status: decision,
        decisionNote: note ?? null,
        decidedBy: user?.id ?? null,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(leaveRequest.id, id));

    if (decision === "approved") {
      await upsertRecord(c.var.db, {
        eventId: row.event.id,
        personId: row.request.personId,
        status: "excused",
        method: "manual",
        checkedInAt: null,
        note: note ?? `Leave approved: ${row.request.reason}`,
        markedBy: user?.id ?? null,
      });
    }

    const [updated] = await rows(c).where(eq(leaveRequest.id, id)).limit(1);
    if (!updated) throw new Error("Update returned no row");

    const asker = await c.var.db
      .select({ userId: person.userId })
      .from(person)
      .where(eq(person.id, row.request.personId))
      .limit(1);

    deliver(
      c,
      await notifyLeaveDecided(c.var.db, {
        organizationId,
        requestId: id,
        userId: asker[0]?.userId ?? null,
        eventTitle: row.event.title,
        decision,
        note: note ?? null,
      }),
    );

    return c.json(toJson(updated), 200);
  });
