import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A } from "@mobily/ts-belt";
import { and, desc, eq, inArray } from "drizzle-orm";
import { statusOf } from "#src/lib/event-status";
import { findEvent, isPast, listEvents, personForUser, settle, toEventJson } from "#src/lib/events";
import { createPass } from "#src/lib/member-pass";
import { organizationGuard, organizationIdOf } from "#src/lib/org-access";
import type { AppEnv } from "#src/types";

const { event: eventTable, attendanceRecord, leaveRequest } = schema;

const PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const attendanceEnum = z.enum(["present", "late", "excused", "absent"]);

const myEventSchema = z.object({
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
      /** What the organizer wrote when marking it by hand. */
      note: z.string().nullable(),
    })
    .nullable(),
  /** My leave request for this event, if I sent one. */
  leave: z
    .object({
      id: z.string(),
      status: z.enum(["pending", "approved", "declined"]),
      reason: z.string(),
      decisionNote: z.string().nullable(),
    })
    .nullable(),
});

const historySchema = z.object({
  eventId: z.string(),
  title: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: attendanceEnum,
  checkedInAt: z.string().nullable(),
  method: z.string(),
  note: z.string().nullable(),
});

const myEventPage = z.object({
  items: z.array(myEventSchema),
  /** Pass it back as `cursor` for the next page. Null when this is the last page. */
  nextCursor: z.string().nullable(),
});

const errorSchema = z.object({ error: z.string() });

const unauthorized = {
  description: "No active event",
  content: { "application/json": { schema: errorSchema } },
} as const;
const forbidden = {
  description: "No organization membership, or not in the directory",
  content: { "application/json": { schema: errorSchema } },
} as const;

const eventsRoute = createRoute({
  method: "get",
  path: "/my/events",
  tags: ["me"],
  summary: "The events that expect me, one page at a time",
  description:
    "Through a group or a registration. `upcoming` runs soonest first, `past` newest first. The page walks the (starts_at, id) index, not an offset.",
  request: {
    query: z.object({
      scope: z.enum(["upcoming", "past"]).optional(),
      cursor: z.string().max(256).optional(),
      limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
    }),
  },
  responses: {
    200: {
      description: "One page of events with my record on each",
      content: { "application/json": { schema: myEventPage } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const passRoute = createRoute({
  method: "get",
  path: "/my/events/{id}/pass",
  tags: ["me"],
  summary: "The pass to show at the door, as text for a QR code",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "The pass",
      content: {
        "application/json": {
          schema: z.object({ code: z.string(), eventTitle: z.string(), personName: z.string() }),
        },
      },
    },
    401: unauthorized,
    403: forbidden,
    404: {
      description: "No such event, or I am not expected",
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

const HISTORY_LIMIT = 200;

const app = new OpenAPIHono<AppEnv>();

app.use("/my", organizationGuard());
app.use("/my/*", organizationGuard());

export const myRoutes = app
  .openapi(eventsRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const me = await personForUser(c.var.db, organizationId, user.id);
    if (!me) return c.json({ error: "You are not in the directory yet." }, 403);

    const query = c.req.valid("query");
    const now = new Date();
    await settle(c.var.db, organizationId, now);

    const page = await listEvents(c.var.db, {
      organizationId,
      scope: query.scope ?? "upcoming",
      expectedPersonId: me.id,
      cursor: query.cursor,
      limit: query.limit ?? PAGE_SIZE,
      now,
    });
    const ids = A.map(page.items, (row) => row.id);

    const records = ids.length
      ? await c.var.db
          .select()
          .from(attendanceRecord)
          .where(and(eq(attendanceRecord.personId, me.id), inArray(attendanceRecord.eventId, ids)))
      : [];
    const byId = new Map(A.map(records, (row) => [row.eventId, row]));

    const leaves = ids.length
      ? await c.var.db
          .select()
          .from(leaveRequest)
          .where(and(eq(leaveRequest.personId, me.id), inArray(leaveRequest.eventId, ids)))
      : [];
    const leaveById = new Map(A.map(leaves, (row) => [row.eventId, row]));

    const json = await toEventJson(c.var.db, page.items, now);

    return c.json(
      {
        items: [
          ...A.map(json, (row) => {
            const record = byId.get(row.id);
            const leave = leaveById.get(row.id);

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
                    note: record.note ?? null,
                  }
                : null,
              leave: leave
                ? {
                    id: leave.id,
                    status: leave.status,
                    reason: leave.reason,
                    decisionNote: leave.decisionNote ?? null,
                  }
                : null,
            };
          }),
        ],
        nextCursor: page.nextCursor,
      },
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

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);
    if (statusOf(found) === "done") return c.json({ error: "This event is over." }, 404);

    const code = await createPass({ secret: found.secret, eventId: id, personId: me.id });

    return c.json({ code, eventTitle: found.title, personName: me.name }, 200);
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
      .select({ record: attendanceRecord, event: eventTable })
      .from(attendanceRecord)
      .innerJoin(eventTable, eq(eventTable.id, attendanceRecord.eventId))
      .where(
        and(
          eq(attendanceRecord.personId, me.id),
          eq(eventTable.organizationId, organizationId),
          isPast(now),
        ),
      )
      .orderBy(desc(eventTable.startsAt))
      .limit(HISTORY_LIMIT);

    return c.json(
      [
        ...A.map(rows, ({ record, event }) => ({
          eventId: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          status: record.status,
          checkedInAt: record.checkedInAt?.toISOString() ?? null,
          method: record.method,
          note: record.note ?? null,
        })),
      ],
      200,
    );
  });
