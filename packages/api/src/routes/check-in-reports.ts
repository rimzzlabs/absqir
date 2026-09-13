import { formatDistance } from "@absqir/core/geo";
import { isRiskReason } from "@absqir/core/location-risk";
import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A, F, pipe } from "@mobily/ts-belt";
import { and, desc, eq, ne } from "drizzle-orm";
import { match, P } from "ts-pattern";
import { statusForCheckIn } from "#src/lib/event-status";
import { findEvent, personForUser, upsertRecord } from "#src/lib/events";
import { organizationGuard, organizationIdOf, roleBelow } from "#src/lib/org-access";
import type { AppEnv } from "#src/types";

const { checkInReport, checkInAttempt, event: eventTable, person, attendanceRecord } = schema;

/**
 * A member's appeal against a refused check-in.
 *
 * The place check is the one rule in absqir that can refuse somebody who did
 * everything right. A phone that will not settle, a basement room, an old
 * receiver: the member stood in front of the screen, scanned the live code,
 * and was still turned away. Without a way back they are marked absent for
 * their hardware.
 *
 * An approval writes the attendance record, timed at the refused scan rather
 * than at the decision, so nobody is marked late for how long an organizer
 * took to read the report.
 */

const reportStatus = z.enum(["pending", "approved", "declined"]);

const reportSchema = z.object({
  id: z.string(),
  status: reportStatus,
  message: z.string(),
  createdAt: z.string(),
  decisionNote: z.string().nullable(),
  decidedAt: z.string().nullable(),
  event: z.object({ id: z.string(), title: z.string(), startsAt: z.string() }),
  person: z.object({ id: z.string(), name: z.string(), email: z.string().nullable() }),
  /**
   * What the refused attempt recorded. Null when the attempt has since been
   * cleaned up, which leaves the member's own words as the whole story.
   */
  attempt: z
    .object({
      at: z.string(),
      verdict: z.string().nullable(),
      /** Already written for a reader: "53.8 km", "340 m". */
      distance: z.string().nullable(),
      accuracyMeters: z.number().nullable(),
      riskReasons: z.array(z.string()),
      /**
       * Always true today, and stated rather than assumed. A refusal only
       * happens after the room screen's code is checked, so reaching this
       * point means the member held a live token from the screen itself.
       */
      heldRoomCode: z.boolean(),
    })
    .nullable(),
  /** How many other reports this person has sent. A pattern is worth seeing. */
  priorReports: z.number(),
});

const errorSchema = z.object({ error: z.string() });
const FORBIDDEN_MESSAGE = "This needs the organizer role or higher";

const unauthorized = {
  description: "No active organization",
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

const createReportRoute = createRoute({
  method: "post",
  path: "/events/{id}/check-in-report",
  tags: ["check-in reports"],
  summary: "Report that the place check refused me unfairly",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().trim().min(1).max(1000),
            /** The refused attempt. The latest one is used when this is absent. */
            attemptId: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Sent", content: { "application/json": { schema: reportSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: {
      description: "Already reported, or already checked in",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const queueRoute = createRoute({
  method: "get",
  path: "/check-in-reports",
  tags: ["check-in reports"],
  summary: "The reports waiting on a decision",
  request: {
    query: z.object({ status: z.enum(["pending", "decided", "all"]).optional() }),
  },
  responses: {
    200: {
      description: "Reports, newest first",
      content: { "application/json": { schema: z.array(reportSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const decideRoute = createRoute({
  method: "post",
  path: "/check-in-reports/{id}/decide",
  tags: ["check-in reports"],
  summary: "Approve or decline. An approval writes the attendance record",
  description:
    "An approval marks the person present or late by the clock at the refused scan, never at the moment of the decision.",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            approve: z.boolean(),
            note: z.string().trim().max(500).nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Decided", content: { "application/json": { schema: reportSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: {
      description: "Already decided",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

type Context = Parameters<typeof organizationIdOf>[0];

/** One report with everything a decision needs, in one read. */
function rows(c: Context) {
  return c.var.db
    .select({
      report: checkInReport,
      event: { id: eventTable.id, title: eventTable.title, startsAt: eventTable.startsAt },
      person: { id: person.id, name: person.name, email: person.email },
      attempt: checkInAttempt,
    })
    .from(checkInReport)
    .innerJoin(eventTable, eq(eventTable.id, checkInReport.eventId))
    .innerJoin(person, eq(person.id, checkInReport.personId))
    .leftJoin(checkInAttempt, eq(checkInAttempt.id, checkInReport.attemptId));
}

// `rows` hands back a query builder, which is awaited to get the array.
type Row = Awaited<ReturnType<typeof rows>>[number];

function toJson(row: Row, priorReports: number) {
  return {
    id: row.report.id,
    status: row.report.status,
    message: row.report.message,
    createdAt: row.report.createdAt.toISOString(),
    decisionNote: row.report.decisionNote ?? null,
    decidedAt: row.report.decidedAt?.toISOString() ?? null,
    event: {
      id: row.event.id,
      title: row.event.title,
      startsAt: row.event.startsAt.toISOString(),
    },
    person: { id: row.person.id, name: row.person.name, email: row.person.email ?? null },
    attempt: match(row.attempt)
      .with(P.nullish, () => null)
      .otherwise((attempt) => ({
        at: attempt.createdAt.toISOString(),
        verdict: attempt.locationVerdict ?? null,
        distance: match(attempt.distanceMeters)
          .with(P.number, (meters) => formatDistance(meters))
          .otherwise(() => null),
        accuracyMeters: attempt.accuracyMeters ?? null,
        riskReasons: pipe(attempt.riskReasons, A.filter(isRiskReason), F.toMutable),
        heldRoomCode: attempt.method === "screen",
      })),
    priorReports,
  };
}

/** The report count for this person, not counting the one being read. */
async function priorCountFor(c: Context, personId: string, exceptId: string) {
  const found = await c.var.db
    .select({ id: checkInReport.id })
    .from(checkInReport)
    .where(and(eq(checkInReport.personId, personId), ne(checkInReport.id, exceptId)));

  return found.length;
}

const byScope = {
  pending: eq(checkInReport.status, "pending"),
  decided: ne(checkInReport.status, "pending"),
  all: undefined,
} as const;

const app = new OpenAPIHono<AppEnv>();

app.use("/check-in-reports", organizationGuard());
app.use("/check-in-reports/*", organizationGuard());
app.use("/events/:id/check-in-report", organizationGuard());

export const checkInReportRoutes = app
  .openapi(createReportRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    const { id: eventId } = c.req.valid("param");
    const { message, attemptId } = c.req.valid("json");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const me = await personForUser(c.var.db, organizationId, user.id);
    if (!me) return c.json({ error: "You are not in the directory yet." }, 403);

    const event = await findEvent(c.var.db, organizationId, eventId);
    if (!event) return c.json({ error: "Not found" }, 404);

    // Somebody already in needs nothing from this.
    const existingRecords = await c.var.db
      .select({ checkedInAt: attendanceRecord.checkedInAt })
      .from(attendanceRecord)
      .where(and(eq(attendanceRecord.eventId, eventId), eq(attendanceRecord.personId, me.id)))
      .limit(1);
    if (existingRecords[0]?.checkedInAt) {
      return c.json({ error: "You are already checked in for this event." }, 409);
    }

    // Name the attempt, or take this person's latest refused one. A member
    // who closed the page still has a report to send.
    const attempts = await c.var.db
      .select({ id: checkInAttempt.id })
      .from(checkInAttempt)
      .where(
        and(
          eq(checkInAttempt.eventId, eventId),
          eq(checkInAttempt.personId, me.id),
          eq(checkInAttempt.outcome, "refused"),
        ),
      )
      .orderBy(desc(checkInAttempt.createdAt))
      .limit(1);

    const attempt = match(attemptId)
      .with(P.string.minLength(1), (named) => named)
      .otherwise(() => attempts[0]?.id ?? null);

    if (!attempt) {
      return c.json({ error: "There is no refused check-in on this event to report." }, 404);
    }

    const id = crypto.randomUUID();

    try {
      await c.var.db.insert(checkInReport).values({
        id,
        organizationId,
        eventId,
        personId: me.id,
        attemptId: attempt,
        message,
      });
    } catch {
      return c.json({ error: "You already reported this event." }, 409);
    }

    const [created] = await rows(c).where(eq(checkInReport.id, id)).limit(1);
    if (!created) throw new Error("Insert returned no row");

    return c.json(toJson(created, await priorCountFor(c, me.id, id)), 201);
  })
  .openapi(queueRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const scope = c.req.valid("query").status ?? "pending";

    const list = await rows(c)
      .where(and(eq(checkInReport.organizationId, organizationId), byScope[scope]))
      .orderBy(desc(checkInReport.createdAt));

    const withCounts = await Promise.all(
      A.map(list, async (row) => toJson(row, await priorCountFor(c, row.person.id, row.report.id))),
    );

    return c.json(pipe(withCounts, F.toMutable), 200);
  })
  .openapi(decideRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const { approve, note } = c.req.valid("json");
    const now = new Date();

    const [found] = await rows(c)
      .where(and(eq(checkInReport.id, id), eq(checkInReport.organizationId, organizationId)))
      .limit(1);
    if (!found) return c.json({ error: "Not found" }, 404);
    if (found.report.status !== "pending") return c.json({ error: "Already decided." }, 409);

    const event = await findEvent(c.var.db, organizationId, found.event.id);
    if (!event) return c.json({ error: "Not found" }, 404);

    await c.var.db.transaction(async (tx) => {
      await tx
        .update(checkInReport)
        .set({
          status: match(approve)
            .with(true, () => "approved" as const)
            .otherwise(() => "declined" as const),
          decidedBy: user?.id ?? null,
          decidedAt: now,
          decisionNote: note?.trim() || null,
          updatedAt: now,
        })
        .where(eq(checkInReport.id, id));

      if (!approve) return;

      // The clock that matters is the refused scan, not this decision. A
      // member who scanned on time must not be marked late because the
      // report waited an hour to be read.
      const scannedAt = found.attempt?.createdAt ?? found.report.createdAt;

      await upsertRecord(tx, {
        eventId: found.event.id,
        personId: found.person.id,
        status: statusForCheckIn(event, scannedAt),
        method: "manual",
        checkedInAt: scannedAt,
        note: note?.trim() || "Approved from a check-in report.",
        markedBy: user?.id ?? null,
      });
    });

    const [updated] = await rows(c).where(eq(checkInReport.id, id)).limit(1);
    if (!updated) throw new Error("Update returned no row");

    return c.json(toJson(updated, await priorCountFor(c, updated.person.id, id)), 200);
  });
