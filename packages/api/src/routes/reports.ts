import type { Database } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A } from "@mobily/ts-belt";
import type { Context } from "hono";
import { csvCell } from "#src/lib/csv";
import { organizationGuard, organizationIdOf, requireRole } from "#src/lib/org-access";
import {
  type ReportRange,
  reportByGroup,
  reportByPerson,
  reportBySession,
  reportSummary,
} from "#src/lib/reports";
import { settle } from "#src/lib/sessions";
import type { AppEnv } from "#src/types";

const countsSchema = z.object({
  present: z.number(),
  late: z.number(),
  excused: z.number(),
  absent: z.number(),
});

const summarySchema = z.object({
  from: z.string(),
  to: z.string(),
  sessions: z.number(),
  closedSessions: z.number(),
  people: z.number(),
  counts: countsSchema,
  attendanceRate: z.number().nullable(),
  punctualityRate: z.number().nullable(),
});

const personRowSchema = z.object({
  personId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  identifier: z.string().nullable(),
  counts: countsSchema,
  attendanceRate: z.number().nullable(),
  punctualityRate: z.number().nullable(),
});

const groupRowSchema = z.object({
  groupId: z.string(),
  name: z.string(),
  people: z.number(),
  counts: countsSchema,
  attendanceRate: z.number().nullable(),
});

const sessionRowSchema = z.object({
  sessionId: z.string(),
  title: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  closed: z.boolean(),
  counts: countsSchema,
  attendanceRate: z.number().nullable(),
});

const rangeQuery = z.object({
  /** Both ends are absolute instants, so the caller owns the timezone. */
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
  groupId: z.string().optional(),
});

const errorSchema = z.object({ error: z.string() });

const unauthorized = {
  description: "No active session",
  content: { "application/json": { schema: errorSchema } },
} as const;
const forbidden = {
  description: "Not a member, or the role is too low",
  content: { "application/json": { schema: errorSchema } },
} as const;

const summaryRoute = createRoute({
  method: "get",
  path: "/reports/summary",
  tags: ["reports"],
  summary: "Totals for every session that starts inside the range",
  request: { query: rangeQuery },
  responses: {
    200: { description: "Totals", content: { "application/json": { schema: summarySchema } } },
    401: unauthorized,
    403: forbidden,
  },
});

const peopleRoute = createRoute({
  method: "get",
  path: "/reports/people",
  tags: ["reports"],
  summary: "One row per person, by name",
  request: { query: rangeQuery },
  responses: {
    200: {
      description: "Rows",
      content: { "application/json": { schema: z.array(personRowSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const groupsRoute = createRoute({
  method: "get",
  path: "/reports/groups",
  tags: ["reports"],
  summary: "One row per group, by name",
  request: { query: rangeQuery },
  responses: {
    200: {
      description: "Rows",
      content: { "application/json": { schema: z.array(groupRowSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const sessionsRoute = createRoute({
  method: "get",
  path: "/reports/sessions",
  tags: ["reports"],
  summary: "One row per session, newest first",
  request: { query: rangeQuery },
  responses: {
    200: {
      description: "Rows",
      content: { "application/json": { schema: z.array(sessionRowSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

type RangeQuery = z.infer<typeof rangeQuery>;

function rangeOfQuery(query: RangeQuery): ReportRange {
  return {
    from: new Date(query.from),
    to: new Date(query.to),
    groupId: query.groupId ?? null,
  };
}

/** Reads the same three values off a plain request, for the CSV handlers. */
function rangeOfUrl(url: URL): ReportRange | null {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) return null;

  const range = {
    from: new Date(from),
    to: new Date(to),
    groupId: url.searchParams.get("groupId") || null,
  };

  if (Number.isNaN(range.from.getTime()) || Number.isNaN(range.to.getTime())) return null;

  return range;
}

function percent(rate: number | null): string {
  return rate === null ? "" : `${Math.round(rate * 100)}%`;
}

type CsvTable = "people" | "groups" | "sessions";

async function csvLines(
  db: Database,
  organizationId: string,
  table: CsvTable,
  range: ReportRange,
): Promise<string[]> {
  if (table === "people") {
    const rows = await reportByPerson(db, organizationId, range);

    return [
      "name,email,identifier,present,late,excused,absent,attendance_rate,punctuality_rate",
      ...A.map(rows, (row) =>
        [
          csvCell(row.name),
          csvCell(row.email ?? ""),
          csvCell(row.identifier ?? ""),
          row.counts.present,
          row.counts.late,
          row.counts.excused,
          row.counts.absent,
          percent(row.attendanceRate),
          percent(row.punctualityRate),
        ].join(","),
      ),
    ];
  }

  if (table === "groups") {
    const rows = await reportByGroup(db, organizationId, range);

    return [
      "group,people,present,late,excused,absent,attendance_rate",
      ...A.map(rows, (row) =>
        [
          csvCell(row.name),
          row.people,
          row.counts.present,
          row.counts.late,
          row.counts.excused,
          row.counts.absent,
          percent(row.attendanceRate),
        ].join(","),
      ),
    ];
  }

  const rows = await reportBySession(db, organizationId, range);

  return [
    "session,starts_at,ends_at,closed,present,late,excused,absent,attendance_rate",
    ...A.map(rows, (row) =>
      [
        csvCell(row.title),
        row.startsAt,
        row.endsAt,
        row.closed ? "yes" : "no",
        row.counts.present,
        row.counts.late,
        row.counts.excused,
        row.counts.absent,
        percent(row.attendanceRate),
      ].join(","),
    ),
  ];
}

async function csvHandler(c: Context<AppEnv>, table: CsvTable) {
  const organizationId = organizationIdOf(c);
  const range = rangeOfUrl(new URL(c.req.url));
  if (!range) return c.json({ error: "Give a from and a to, both ISO instants." }, 400);

  await settle(c.var.db, organizationId);

  const lines = await csvLines(c.var.db, organizationId, table, range);

  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="attendance-by-${table}.csv"`);

  return c.body(lines.join("\n"));
}

const app = new OpenAPIHono<AppEnv>();

app.use("/reports/*", organizationGuard(), requireRole("organizer"));

export const reportRoutes = app
  .openapi(summaryRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const query = c.req.valid("query");

    await settle(c.var.db, organizationId);

    const summary = await reportSummary(c.var.db, organizationId, rangeOfQuery(query));

    return c.json(summary, 200);
  })
  .openapi(peopleRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const query = c.req.valid("query");

    await settle(c.var.db, organizationId);

    const rows = await reportByPerson(c.var.db, organizationId, rangeOfQuery(query));

    return c.json(rows, 200);
  })
  .openapi(groupsRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const query = c.req.valid("query");

    await settle(c.var.db, organizationId);

    const rows = await reportByGroup(c.var.db, organizationId, rangeOfQuery(query));

    return c.json(rows, 200);
  })
  .openapi(sessionsRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const query = c.req.valid("query");

    await settle(c.var.db, organizationId);

    const rows = await reportBySession(c.var.db, organizationId, rangeOfQuery(query));

    return c.json(rows, 200);
  })
  .get("/reports/people.csv", (c) => csvHandler(c, "people"))
  .get("/reports/groups.csv", (c) => csvHandler(c, "groups"))
  .get("/reports/sessions.csv", (c) => csvHandler(c, "sessions"));
