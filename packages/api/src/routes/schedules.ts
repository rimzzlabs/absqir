import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A, pipe } from "@mobily/ts-belt";
import { and, asc, eq, gte, inArray, isNull } from "drizzle-orm";
import { organizationGuard, organizationIdOf, requireRole, roleBelow } from "#src/lib/org-access";
import { materializeSchedules } from "#src/lib/schedule";
import type { AppEnv } from "#src/types";

const { schedule, scheduleGroup, group, attendanceSession } = schema;

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const scheduleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  frequency: z.enum(["daily", "weekly"]),
  weekdays: z.array(z.number()),
  startTime: z.string(),
  durationMinutes: z.number(),
  lateAfterMinutes: z.number(),
  opensBeforeMinutes: z.number(),
  timezone: z.string(),
  startsOn: z.string(),
  endsOn: z.string().nullable(),
  active: z.boolean(),
  allowWalkIns: z.boolean(),
  groups: z.array(z.object({ id: z.string(), name: z.string() })),
  createdAt: z.string(),
});

const scheduleInput = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  frequency: z.enum(["daily", "weekly"]),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7),
  startTime: z.string().regex(CLOCK),
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60),
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
  timezone: z.string().min(1).max(64),
  startsOn: z.string().regex(DAY),
  endsOn: z.string().regex(DAY).nullable().optional(),
  active: z.boolean().optional(),
  allowWalkIns: z.boolean().optional(),
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
const badRule = {
  description: "A weekly rule needs at least one weekday, or the timezone is unknown",
  content: { "application/json": { schema: errorSchema } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/schedules",
  tags: ["schedules"],
  summary: "List the schedules of the active organization",
  responses: {
    200: {
      description: "Schedules, by title",
      content: { "application/json": { schema: z.array(scheduleSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const createRouteDef = createRoute({
  method: "post",
  path: "/schedules",
  tags: ["schedules"],
  summary: "Create a schedule. Sessions for the next two weeks appear at once",
  request: { body: { content: { "application/json": { schema: scheduleInput } } } },
  responses: {
    201: {
      description: "The schedule",
      content: { "application/json": { schema: scheduleSchema } },
    },
    400: badRule,
    401: unauthorized,
    403: forbidden,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/schedules/{id}",
  tags: ["schedules"],
  summary: "Edit a schedule. Future sessions it spawned are replaced",
  request: {
    params: idParam,
    body: { content: { "application/json": { schema: scheduleInput.partial() } } },
  },
  responses: {
    200: {
      description: "The schedule",
      content: { "application/json": { schema: scheduleSchema } },
    },
    400: badRule,
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const removeRoute = createRoute({
  method: "delete",
  path: "/schedules/{id}",
  tags: ["schedules"],
  summary: "Delete a schedule and the future sessions it spawned",
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

type ScheduleRow = typeof schedule.$inferSelect;

function validTimezone(name: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

async function withGroups(c: Parameters<typeof organizationIdOf>[0], rows: ScheduleRow[]) {
  const ids = A.map(rows, (row) => row.id);
  const groups = ids.length
    ? await c.var.db
        .select({ scheduleId: scheduleGroup.scheduleId, id: group.id, name: group.name })
        .from(scheduleGroup)
        .innerJoin(group, eq(group.id, scheduleGroup.groupId))
        .where(inArray(scheduleGroup.scheduleId, ids))
        .orderBy(asc(group.name))
    : [];

  return A.map(rows, (row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    frequency: row.frequency,
    weekdays: row.weekdays,
    startTime: row.startTime,
    durationMinutes: row.durationMinutes,
    lateAfterMinutes: row.lateAfterMinutes,
    opensBeforeMinutes: row.opensBeforeMinutes,
    timezone: row.timezone,
    startsOn: row.startsOn,
    endsOn: row.endsOn ?? null,
    active: row.active,
    allowWalkIns: row.allowWalkIns,
    groups: pipe(
      groups,
      A.filter((item) => item.scheduleId === row.id),
      A.map((item) => ({ id: item.id, name: item.name })),
    ),
    createdAt: row.createdAt.toISOString(),
  }));
}

async function findSchedule(c: Parameters<typeof organizationIdOf>[0], id: string) {
  const rows = await c.var.db
    .select()
    .from(schedule)
    .where(and(eq(schedule.id, id), eq(schedule.organizationId, organizationIdOf(c))))
    .limit(1);

  return rows[0] ?? null;
}

async function validGroupIds(c: Parameters<typeof organizationIdOf>[0], ids: string[]) {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return [];

  const rows = await c.var.db
    .select({ id: group.id })
    .from(group)
    .where(and(eq(group.organizationId, organizationIdOf(c)), inArray(group.id, wanted)));

  return A.map(rows, (row) => row.id);
}

/** Future sessions the rule spawned, untouched by anyone, go away with a change. */
async function dropFutureSessions(c: Parameters<typeof organizationIdOf>[0], scheduleId: string) {
  await c.var.db
    .delete(attendanceSession)
    .where(
      and(
        eq(attendanceSession.scheduleId, scheduleId),
        gte(attendanceSession.startsAt, new Date()),
        isNull(attendanceSession.openedAt),
        isNull(attendanceSession.closedAt),
      ),
    );
}

const FORBIDDEN_MESSAGE = "This needs the admin role or higher";

const app = new OpenAPIHono<AppEnv>();

app.use("/schedules", organizationGuard());
app.use("/schedules/*", organizationGuard());
app.use("/schedules", requireRole("organizer"));
app.use("/schedules/*", requireRole("organizer"));

export const scheduleRoutes = app
  .openapi(listRoute, async (c) => {
    const rows = await c.var.db
      .select()
      .from(schedule)
      .where(eq(schedule.organizationId, organizationIdOf(c)))
      .orderBy(asc(schedule.title));

    return c.json(await withGroups(c, rows), 200);
  })
  .openapi(createRouteDef, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const body = c.req.valid("json");

    if (body.frequency === "weekly" && body.weekdays.length === 0) {
      return c.json({ error: "Pick at least one weekday." }, 400);
    }
    if (!validTimezone(body.timezone)) {
      return c.json({ error: "Unknown timezone." }, 400);
    }

    const groupIds = await validGroupIds(c, body.groupIds);
    const id = crypto.randomUUID();

    await c.var.db.transaction(async (tx) => {
      await tx.insert(schedule).values({
        id,
        organizationId,
        title: body.title,
        description: body.description?.trim() || null,
        frequency: body.frequency,
        weekdays: body.frequency === "weekly" ? A.sort(A.uniq(body.weekdays), (a, b) => a - b) : [],
        startTime: body.startTime,
        durationMinutes: body.durationMinutes,
        lateAfterMinutes: body.lateAfterMinutes ?? 15,
        opensBeforeMinutes: body.opensBeforeMinutes ?? 15,
        timezone: body.timezone,
        startsOn: body.startsOn,
        endsOn: body.endsOn ?? null,
        active: body.active ?? true,
        allowWalkIns: body.allowWalkIns ?? false,
      });

      if (groupIds.length) {
        await tx
          .insert(scheduleGroup)
          .values(A.map(groupIds, (groupId) => ({ scheduleId: id, groupId })));
      }
    });

    await materializeSchedules(c.var.db, organizationId);

    const created = await findSchedule(c, id);
    if (!created) throw new Error("Insert returned no row");

    const [json] = await withGroups(c, [created]);
    return c.json(json, 201);
  })
  .openapi(updateRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const found = await findSchedule(c, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const frequency = body.frequency ?? found.frequency;
    const weekdays = body.weekdays ?? found.weekdays;

    if (frequency === "weekly" && weekdays.length === 0) {
      return c.json({ error: "Pick at least one weekday." }, 400);
    }
    if (body.timezone !== undefined && !validTimezone(body.timezone)) {
      return c.json({ error: "Unknown timezone." }, 400);
    }

    const groupIds = body.groupIds ? await validGroupIds(c, body.groupIds) : null;

    await c.var.db.transaction(async (tx) => {
      await tx
        .update(schedule)
        .set({
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined
            ? { description: body.description?.trim() || null }
            : {}),
          frequency,
          weekdays: frequency === "weekly" ? A.sort(A.uniq(weekdays), (a, b) => a - b) : [],
          ...(body.startTime !== undefined ? { startTime: body.startTime } : {}),
          ...(body.durationMinutes !== undefined ? { durationMinutes: body.durationMinutes } : {}),
          ...(body.lateAfterMinutes !== undefined
            ? { lateAfterMinutes: body.lateAfterMinutes }
            : {}),
          ...(body.opensBeforeMinutes !== undefined
            ? { opensBeforeMinutes: body.opensBeforeMinutes }
            : {}),
          ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
          ...(body.startsOn !== undefined ? { startsOn: body.startsOn } : {}),
          ...(body.endsOn !== undefined ? { endsOn: body.endsOn ?? null } : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
          ...(body.allowWalkIns !== undefined ? { allowWalkIns: body.allowWalkIns } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schedule.id, id));

      if (groupIds) {
        await tx.delete(scheduleGroup).where(eq(scheduleGroup.scheduleId, id));
        if (groupIds.length) {
          await tx
            .insert(scheduleGroup)
            .values(A.map(groupIds, (groupId) => ({ scheduleId: id, groupId })));
        }
      }
    });

    await dropFutureSessions(c, id);
    await materializeSchedules(c.var.db, organizationId);

    const updated = await findSchedule(c, id);
    if (!updated) throw new Error("Update returned no row");

    const [json] = await withGroups(c, [updated]);
    return c.json(json, 200);
  })
  .openapi(removeRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const { id } = c.req.valid("param");

    const found = await findSchedule(c, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    await dropFutureSessions(c, id);
    await c.var.db.delete(schedule).where(eq(schedule.id, id));

    return c.json({ deleted: true as const }, 200);
  });
