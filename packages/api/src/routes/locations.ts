import { DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS, MIN_RADIUS_METERS } from "@absqir/core/geo";
import { type Database, schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A, F, pipe } from "@mobily/ts-belt";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { match, P } from "ts-pattern";
import { organizationGuard, organizationIdOf, requireRole, roleBelow } from "#src/lib/org-access";
import type { AppEnv } from "#src/types";

const { location, event: eventTable, schedule } = schema;

const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number(),
  /** How many events and schedules point here. A place in use is not deleted lightly. */
  eventCount: z.number(),
  scheduleCount: z.number(),
  createdAt: z.string(),
});

const locationInput = z.object({
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().max(300).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z
    .number()
    .int()
    .min(MIN_RADIUS_METERS)
    .max(MAX_RADIUS_METERS)
    .default(DEFAULT_RADIUS_METERS),
});

const errorSchema = z.object({ error: z.string() });
const idParam = z.object({ id: z.string() });
const FORBIDDEN_MESSAGE = "This needs the admin role or higher";

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
const conflict = {
  description: "A place with that name exists",
  content: { "application/json": { schema: errorSchema } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/locations",
  tags: ["locations"],
  summary: "List the places the organization checks people in at",
  responses: {
    200: {
      description: "Places, by name",
      content: { "application/json": { schema: z.array(locationSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const createRouteDef = createRoute({
  method: "post",
  path: "/locations",
  tags: ["locations"],
  summary: "Save a place",
  request: { body: { content: { "application/json": { schema: locationInput } } } },
  responses: {
    201: { description: "The place", content: { "application/json": { schema: locationSchema } } },
    401: unauthorized,
    403: forbidden,
    409: conflict,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/locations/{id}",
  tags: ["locations"],
  summary: "Move or rename a place",
  description:
    "Events already created keep the fence they were given. Only events made after the edit, and events a schedule spawns later, use the new one.",
  request: {
    params: idParam,
    body: { content: { "application/json": { schema: locationInput.partial() } } },
  },
  responses: {
    200: { description: "The place", content: { "application/json": { schema: locationSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: conflict,
  },
});

const removeRoute = createRoute({
  method: "delete",
  path: "/locations/{id}",
  tags: ["locations"],
  summary: "Delete a place",
  description:
    "Events that used it keep their own copy of the fence, so no past check-in changes meaning.",
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

type LocationRow = typeof location.$inferSelect;

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function toJson(row: LocationRow, eventCount: number, scheduleCount: number) {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radiusMeters,
    eventCount,
    scheduleCount,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findLocation(db: Database, organizationId: string, id: string) {
  const rows = await db
    .select()
    .from(location)
    .where(and(eq(location.id, id), eq(location.organizationId, organizationId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Two small counts, so the list can warn before a delete. */
async function usageOf(db: Database, id: string) {
  const [events, schedules] = await Promise.all([
    db.select({ total: count() }).from(eventTable).where(eq(eventTable.locationId, id)),
    db.select({ total: count() }).from(schedule).where(eq(schedule.locationId, id)),
  ]);

  return { eventCount: events[0]?.total ?? 0, scheduleCount: schedules[0]?.total ?? 0 };
}

const app = new OpenAPIHono<AppEnv>();

app.use("/locations", organizationGuard());
app.use("/locations/*", organizationGuard());
app.use("/locations", requireRole("organizer"));
app.use("/locations/*", requireRole("organizer"));

export const locationRoutes = app
  .openapi(listRoute, async (c) => {
    const organizationId = organizationIdOf(c);

    const rows = await c.var.db
      .select()
      .from(location)
      .where(eq(location.organizationId, organizationId))
      .orderBy(asc(sql`lower(${location.name})`));

    const withUsage = await Promise.all(
      A.map(rows, async (row) => {
        const usage = await usageOf(c.var.db, row.id);

        return toJson(row, usage.eventCount, usage.scheduleCount);
      }),
    );

    return c.json(pipe(withUsage, F.toMutable), 200);
  })
  .openapi(createRouteDef, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    const body = c.req.valid("json");

    try {
      const [created] = await c.var.db
        .insert(location)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          name: body.name,
          address: body.address?.trim() || null,
          latitude: body.latitude,
          longitude: body.longitude,
          radiusMeters: body.radiusMeters,
          createdBy: user?.id ?? null,
        })
        .returning();

      if (!created) throw new Error("Insert returned no row");

      return c.json(toJson(created, 0, 0), 201);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ error: c.var.t("errors:placeNameTaken") }, 409);
      }

      throw error;
    }
  })
  .openapi(updateRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const found = await findLocation(c.var.db, organizationId, id);
    if (!found) return c.json({ error: c.var.t("errors:notFound") }, 404);

    try {
      const [updated] = await c.var.db
        .update(location)
        .set({
          name: body.name ?? found.name,
          address: match(body.address)
            .with(P.nullish, () => found.address)
            .otherwise((address) => address.trim() || null),
          latitude: body.latitude ?? found.latitude,
          longitude: body.longitude ?? found.longitude,
          radiusMeters: body.radiusMeters ?? found.radiusMeters,
          updatedAt: new Date(),
        })
        .where(eq(location.id, id))
        .returning();

      if (!updated) return c.json({ error: c.var.t("errors:notFound") }, 404);

      const usage = await usageOf(c.var.db, id);

      return c.json(toJson(updated, usage.eventCount, usage.scheduleCount), 200);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ error: c.var.t("errors:placeNameTaken") }, 409);
      }

      throw error;
    }
  })
  .openapi(removeRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const found = await findLocation(c.var.db, organizationId, id);
    if (!found) return c.json({ error: c.var.t("errors:notFound") }, 404);

    await c.var.db.delete(location).where(eq(location.id, id));

    return c.json({ deleted: true } as const, 200);
  });
