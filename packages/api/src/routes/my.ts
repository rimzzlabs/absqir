import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A, F, O, pipe } from "@mobily/ts-belt";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { match } from "ts-pattern";
import { statusOf } from "#src/lib/event-status";
import {
  type EventJson,
  expectedPersonIds,
  findEvent,
  isExpected,
  isPast,
  listEvents,
  personForUser,
  type RecordRow,
  settle,
  toEventJson,
} from "#src/lib/events";
import { createPass } from "#src/lib/member-pass";
import { organizationGuard, organizationIdOf } from "#src/lib/org-access";
import { whenAny } from "#src/lib/query";
import { buildRoster } from "#src/lib/roster";
import type { AppEnv } from "#src/types";

const { event: eventTable, attendanceRecord, leaveRequest, person } = schema;

type LeaveRow = typeof leaveRequest.$inferSelect;

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

type MyEventJson = z.infer<typeof myEventSchema>;

/**
 * The member's view of one event. Built field by field on purpose: the
 * organizer's `EventJson` carries head counts a member must not read.
 */
function toMyEvent(
  row: EventJson,
  record: RecordRow | undefined,
  leave: LeaveRow | undefined,
): MyEventJson {
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
    record: pipe(
      O.fromNullable(record),
      O.map((mine) => ({
        status: mine.status,
        checkedInAt: mine.checkedInAt?.toISOString() ?? null,
        method: mine.method,
        note: mine.note ?? null,
      })),
      O.toNullable,
    ),
    leave: pipe(
      O.fromNullable(leave),
      O.map((asked) => ({
        id: asked.id,
        status: asked.status,
        reason: asked.reason,
        decisionNote: asked.decisionNote ?? null,
      })),
      O.toNullable,
    ),
  };
}

const attendeeSchema = z.object({ id: z.string(), name: z.string() });

const myEventDetailSchema = myEventSchema.extend({
  /** Everyone expected, by name. Never the email and never the identifier. */
  attendees: z.array(attendeeSchema),
  /** Everyone expected, even the names past the cap. */
  expectedTotal: z.number(),
  /** How many of them checked in. No per-person status. */
  checkedInCount: z.number(),
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

const detailRoute = createRoute({
  method: "get",
  path: "/my/events/{id}",
  tags: ["me"],
  summary: "One event that expects me, with the names of everyone else expected",
  description:
    "Names and one head count. No email, no identifier, and no per-person status. The answer is 404 when the event does not expect me, the same as the pass.",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "The event, my record, my leave, and who else is on the list",
      content: { "application/json": { schema: myEventDetailSchema } },
    },
    401: unauthorized,
    403: forbidden,
    404: {
      description: "No such event, or I am not expected",
      content: { "application/json": { schema: errorSchema } },
    },
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

    const records = await whenAny(ids, (some) =>
      c.var.db
        .select()
        .from(attendanceRecord)
        .where(
          and(eq(attendanceRecord.personId, me.id), inArray(attendanceRecord.eventId, [...some])),
        ),
    );
    const byId = new Map(A.map(records, (row) => [row.eventId, row]));

    const leaves = await whenAny(ids, (some) =>
      c.var.db
        .select()
        .from(leaveRequest)
        .where(and(eq(leaveRequest.personId, me.id), inArray(leaveRequest.eventId, [...some]))),
    );
    const leaveById = new Map(A.map(leaves, (row) => [row.eventId, row]));

    const json = await toEventJson(c.var.db, page.items, now);

    return c.json(
      {
        items: pipe(
          json,
          A.map((row) => toMyEvent(row, byId.get(row.id), leaveById.get(row.id))),
          F.toMutable,
        ),
        nextCursor: page.nextCursor,
      },
      200,
    );
  })
  .openapi(detailRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    const { id } = c.req.valid("param");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const me = await personForUser(c.var.db, organizationId, user.id);
    if (!me) return c.json({ error: "You are not in the directory yet." }, 403);

    const now = new Date();
    await settle(c.var.db, organizationId, now);

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    // An event that never expected this reader tells them nothing, not even
    // that it exists. The same rule as the pass.
    const expected = await isExpected(c.var.db, id, me.id);
    if (!expected) return c.json({ error: "Not found" }, 404);

    const [json, expectedIds, records, leaves] = await Promise.all([
      toEventJson(c.var.db, [found], now),
      expectedPersonIds(c.var.db, id),
      c.var.db
        .select({ row: attendanceRecord })
        .from(attendanceRecord)
        .where(eq(attendanceRecord.eventId, id)),
      c.var.db
        .select()
        .from(leaveRequest)
        .where(and(eq(leaveRequest.eventId, id), eq(leaveRequest.personId, me.id)))
        .limit(1),
    ]);

    const event = json[0];
    if (!event) throw new Error("toEventJson returned no row");

    const names = await whenAny(expectedIds, (some) =>
      c.var.db
        .select({ id: person.id, name: person.name })
        .from(person)
        .where(inArray(person.id, [...some]))
        .orderBy(asc(sql`lower(${person.name})`)),
    );

    const roster = buildRoster({
      expected: names,
      meId: me.id,
      checkedIn: A.filterMap(records, ({ row }) =>
        match(row.status)
          .with("present", "late", () => row.personId)
          .otherwise(() => undefined),
      ),
    });
    const mine = A.find(records, ({ row }) => row.personId === me.id)?.row;

    return c.json({ ...toMyEvent(event, mine, leaves[0]), ...roster }, 200);
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
      pipe(
        rows,
        A.map(({ record, event }) => ({
          eventId: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          status: record.status,
          checkedInAt: record.checkedInAt?.toISOString() ?? null,
          method: record.method,
          note: record.note ?? null,
        })),
        F.toMutable,
      ),
      200,
    );
  });
