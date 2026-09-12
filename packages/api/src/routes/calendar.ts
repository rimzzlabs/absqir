import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A, pipe } from "@mobily/ts-belt";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { settle, toEventJson } from "#src/lib/events";
import { organizationGuard, organizationIdOf, requireRole } from "#src/lib/org-access";
import { occurrencesBetween } from "#src/lib/schedule";
import type { AppEnv } from "#src/types";

const { event: eventTable, schedule } = schema;

const groupRef = z.object({ id: z.string(), name: z.string() });

const countsSchema = z.object({
  expected: z.number(),
  registered: z.number(),
  present: z.number(),
  late: z.number(),
  excused: z.number(),
  absent: z.number(),
});

const dayEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum(["scheduled", "running", "done"]),
  scheduleId: z.string().nullable(),
  registrationOpen: z.boolean(),
  groups: z.array(groupRef),
  counts: countsSchema,
});

/** An event a schedule will spawn later. It has no row yet, so no id. */
const projectedSchema = z.object({
  scheduleId: z.string(),
  title: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
});

const calendarSchema = z.object({
  events: z.array(dayEventSchema),
  projected: z.array(projectedSchema),
});

const errorSchema = z.object({ error: z.string() });

const calendarRoute = createRoute({
  method: "get",
  path: "/calendar",
  tags: ["events"],
  summary: "Events that touch the range, plus the ones schedules still owe",
  request: {
    query: z.object({
      from: z.iso.datetime({ offset: true }),
      to: z.iso.datetime({ offset: true }),
    }),
  },
  responses: {
    200: {
      description: "Events and projections, soonest first",
      content: { "application/json": { schema: calendarSchema } },
    },
    401: {
      description: "No active event",
      content: { "application/json": { schema: errorSchema } },
    },
    403: {
      description: "Not a member, or the role is too low",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const MINUTE_MS = 60_000;

const app = new OpenAPIHono<AppEnv>();

app.use("/calendar", organizationGuard(), requireRole("organizer"));

export const calendarRoutes = app.openapi(calendarRoute, async (c) => {
  const organizationId = organizationIdOf(c);
  const query = c.req.valid("query");
  const from = new Date(query.from);
  const to = new Date(query.to);
  const now = new Date();

  await settle(c.var.db, organizationId, now);

  const rows = await c.var.db
    .select()
    .from(eventTable)
    .where(
      and(
        eq(eventTable.organizationId, organizationId),
        lte(eventTable.startsAt, to),
        gte(eventTable.endsAt, from),
      ),
    )
    .orderBy(asc(eventTable.startsAt));

  const events = await toEventJson(c.var.db, rows, now);

  // Schedules only spawn events a fortnight ahead. Browsing a later month
  // still shows what those rules will produce, marked as not created yet.
  const rules = await c.var.db
    .select()
    .from(schedule)
    .where(and(eq(schedule.organizationId, organizationId), eq(schedule.active, true)));

  const taken = new Set(
    pipe(
      rows,
      A.filter((row) => row.scheduleId !== null),
      A.map((row) => `${row.scheduleId}:${row.startsAt.getTime()}`),
    ),
  );

  const projected = A.flatMap(rules, (rule) =>
    pipe(
      occurrencesBetween(rule, from > now ? from : now, to),
      A.filter((startsAt) => !taken.has(`${rule.id}:${startsAt.getTime()}`)),
      A.map((startsAt) => ({
        scheduleId: rule.id,
        title: rule.title,
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + rule.durationMinutes * MINUTE_MS).toISOString(),
      })),
    ),
  );

  return c.json(
    {
      events: [
        ...A.map(events, (row) => ({
          id: row.id,
          title: row.title,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          status: row.status,
          scheduleId: row.scheduleId,
          registrationOpen: row.registrationOpen,
          groups: row.groups,
          counts: row.counts,
        })),
      ],
      projected: [...A.sort(projected, (a, b) => a.startsAt.localeCompare(b.startsAt))],
    },
    200,
  );
});
