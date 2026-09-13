import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A, F, O, pipe } from "@mobily/ts-belt";
import { and, eq, inArray } from "drizzle-orm";
import { match, P } from "ts-pattern";
import { csvCell } from "#src/lib/csv";
import { acceptsCheckIns, statusForCheckIn, statusOf } from "#src/lib/event-status";
import {
  eventRecords,
  existingRecord,
  finalizeEvent,
  findEvent,
  isExpected,
  listEvents,
  personForUser,
  settle,
  toEventJson,
  upsertRecord,
} from "#src/lib/events";
import { checkLocation, type LocationClaim, recordAttempt } from "#src/lib/location-check";
import { parsePass, verifyPass } from "#src/lib/member-pass";
import { readNetwork } from "#src/lib/network";
import { organizationGuard, organizationIdOf, requireRole, roleBelow } from "#src/lib/org-access";
import { createQrToken, verifyQrToken } from "#src/lib/qr-token";
import { randomSecret } from "#src/lib/schedule";
import type { AppEnv } from "#src/types";

const { event: eventTable, eventGroup, group, member } = schema;

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

const eventSchema = z.object({
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
  requireLocation: z.boolean(),
  fence: z
    .object({
      locationId: z.string().nullable(),
      name: z.string().nullable(),
      latitude: z.number(),
      longitude: z.number(),
      radiusMeters: z.number(),
    })
    .nullable(),
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
  location: z
    .object({
      verdict: z.enum(["inside", "edge", "outside", "coarse", "missing"]),
      distanceMeters: z.number().nullable(),
      accuracyMeters: z.number().nullable(),
      riskScore: z.number(),
      riskReasons: z.array(z.string()),
      flagged: z.boolean(),
      reviewedAt: z.string().nullable(),
    })
    .nullable(),
});

/**
 * One reading from the device. Everything the Geolocation API hands over is
 * kept, because the parts nobody thinks about, the altitude and the shape of
 * the error bar, are what tell a satellite fix from a made-up one.
 */
const fixSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(1_000_000),
  altitude: z.number().nullable(),
  altitudeAccuracy: z.number().nullable(),
  speed: z.number().nullable(),
  heading: z.number().nullable(),
  at: z.number().int(),
});

/**
 * What the page reports about itself and about where it is. None of it is
 * trusted: a client can send anything here, and the point of the burst is
 * that a convincing lie has to be consistent across every field and across
 * every event the person attends.
 */
const locationClaimSchema = z.object({
  fixes: z.array(fixSchema).min(1).max(20),
  nativeGeolocation: z.boolean(),
  automated: z.boolean(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).nullable(),
  timezone: z.string().max(64).nullable(),
});

const locationResult = z.object({
  verdict: z.enum(["inside", "edge", "outside", "coarse", "missing"]).nullable(),
  distanceMeters: z.number().nullable(),
  /** True when the organizer will see this record flagged. */
  flagged: z.boolean(),
});

const checkInResult = z.object({
  status: attendanceEnum,
  checkedInAt: z.string(),
  /** The person already had a record; nothing changed. */
  already: z.boolean(),
  eventTitle: z.string(),
  personName: z.string(),
  /** Null when the event never asked where the person was. */
  location: locationResult.nullable(),
});

const eventInput = z.object({
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
  /** A saved place. Null clears the fence. */
  locationId: z.string().nullable().optional(),
  /** Opts the event in. Without a place it stays off, because there is no fence. */
  requireLocation: z.boolean().optional(),
  groupIds: z.array(z.string()).max(100),
});

const errorSchema = z.object({ error: z.string() });
const idParam = z.object({ id: z.string() });

const unauthorized = {
  description: "No active event",
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

const eventPage = z.object({
  items: z.array(eventSchema),
  /** Pass it back as `cursor` for the next page. Null when this is the last page. */
  nextCursor: z.string().nullable(),
});

const listRoute = createRoute({
  method: "get",
  path: "/events",
  tags: ["events"],
  summary: "List events, one page at a time. Also spawns scheduled ones and closes ended ones",
  request: { query: listQuery },
  responses: {
    200: {
      description: "Upcoming events soonest first, past ones newest first",
      content: { "application/json": { schema: eventPage } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const createRouteDef = createRoute({
  method: "post",
  path: "/events",
  tags: ["events"],
  summary: "Create an event",
  request: { body: { content: { "application/json": { schema: eventInput } } } },
  responses: {
    201: { description: "The event", content: { "application/json": { schema: eventSchema } } },
    400: badTimes,
    401: unauthorized,
    403: forbidden,
  },
});

const detailRoute = createRoute({
  method: "get",
  path: "/events/{id}",
  tags: ["events"],
  summary: "Read one event",
  request: { params: idParam },
  responses: {
    200: { description: "The event", content: { "application/json": { schema: eventSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/events/{id}",
  tags: ["events"],
  summary: "Edit an event",
  request: {
    params: idParam,
    body: { content: { "application/json": { schema: eventInput.partial() } } },
  },
  responses: {
    200: { description: "The event", content: { "application/json": { schema: eventSchema } } },
    400: badTimes,
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const removeRoute = createRoute({
  method: "delete",
  path: "/events/{id}",
  tags: ["events"],
  summary: "Delete an event and its records",
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
  path: "/events/{id}/open",
  tags: ["events"],
  summary: "Open check-in ahead of the window",
  request: { params: idParam },
  responses: {
    200: { description: "The event", content: { "application/json": { schema: eventSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: { description: "Already done", content: { "application/json": { schema: errorSchema } } },
  },
});

const closeRoute = createRoute({
  method: "post",
  path: "/events/{id}/close",
  tags: ["events"],
  summary: "Close the event now and mark the missing as absent",
  request: { params: idParam },
  responses: {
    200: { description: "The event", content: { "application/json": { schema: eventSchema } } },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const recordsRoute = createRoute({
  method: "get",
  path: "/events/{id}/records",
  tags: ["events"],
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
  path: "/events/{id}/records/{personId}",
  tags: ["events"],
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
  path: "/events/{id}/qr-token",
  tags: ["events"],
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
  path: "/events/{id}/check-in",
  tags: ["events"],
  summary: "Check yourself in with the token from the room screen",
  description:
    "Any signed-in member of the event's organization. The token proves the reader saw the live screen; the account proves who they are.",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            token: z.string().min(1),
            /** Required only when the event asks for it. */
            location: locationClaimSchema.nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Checked in", content: { "application/json": { schema: checkInResult } } },
    401: {
      description: "No event, or the token expired",
      content: { "application/json": { schema: errorSchema } },
    },
    403: {
      description: "Not a member, not in the directory, or not expected",
      content: { "application/json": { schema: errorSchema } },
    },
    404: notFound,
    409: {
      description: "Outside the event's place, or the reading was unusable",
      content: { "application/json": { schema: errorSchema.extend({ location: locationResult }) } },
    },
    410: {
      description: "Check-in is not open",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const reviewRoute = createRoute({
  method: "post",
  path: "/events/{id}/records/{personId}/review",
  tags: ["events"],
  summary: "Clear the flag on a check-in",
  description:
    "Marks a flagged record as looked at. The signals stay on the row, so the history is not lost. To reject the check-in, mark the person absent instead.",
  request: {
    params: z.object({ id: z.string(), personId: z.string() }),
  },
  responses: {
    200: {
      description: "Reviewed",
      content: { "application/json": { schema: z.object({ reviewedAt: z.string() }) } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

const scanRoute = createRoute({
  method: "post",
  path: "/events/{id}/scan",
  tags: ["events"],
  summary: "Check someone in from the pass on their phone",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            code: z.string().min(1),
            /** The scanning device's own reading, not the member's. */
            location: locationClaimSchema.nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Checked in", content: { "application/json": { schema: checkInResult } } },
    400: {
      description: "Not a pass, or a pass for another event",
      content: { "application/json": { schema: errorSchema } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: {
      description: "The scanning device is outside the event's place",
      content: { "application/json": { schema: errorSchema.extend({ location: locationResult }) } },
    },
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

/**
 * Turns a saved place into the fence columns an event carries. The copy is
 * the point: an event judged a check-in against the circle as it stood that
 * day, and moving the place later must not rewrite that.
 *
 * `requireLocation` without a place is not an error, it is simply off. There
 * is no fence to be outside of.
 */
async function fenceColumns(
  c: Parameters<typeof organizationIdOf>[0],
  locationId: string | null | undefined,
  requireLocation: boolean,
) {
  const organizationId = organizationIdOf(c);

  const place = await match(locationId)
    .with(P.string.minLength(1), async (id) => {
      const rows = await c.var.db
        .select()
        .from(schema.location)
        .where(and(eq(schema.location.id, id), eq(schema.location.organizationId, organizationId)))
        .limit(1);

      return rows[0] ?? null;
    })
    .otherwise(() => Promise.resolve(null));

  return match([requireLocation, place] as const)
    .with([true, P.nonNullable], ([, found]) => ({
      locationId: found.id,
      requireLocation: true,
      latitude: found.latitude,
      longitude: found.longitude,
      radiusMeters: found.radiusMeters,
    }))
    .otherwise(() => ({
      locationId: place?.id ?? null,
      requireLocation: false,
      latitude: null,
      longitude: null,
      radiusMeters: null,
    }));
}

const FORBIDDEN_MESSAGE = "This needs the organizer role or higher";

const app = new OpenAPIHono<AppEnv>();

// Self check-in is for every member. Every other read and write checks the
// role inline. A member reads their own events through `/my/events`.
app.use("/events", organizationGuard());
app.use("/events/*", organizationGuard());

export const eventRoutes = app
  .openapi(listRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const query = c.req.valid("query");
    const now = new Date();

    await settle(c.var.db, organizationId, now);
    const page = await listEvents(c.var.db, {
      organizationId,
      scope: query.scope ?? "upcoming",
      q: query.q || undefined,
      groupId: query.groupId || undefined,
      cursor: query.cursor,
      limit: query.limit ?? PAGE_SIZE,
      now,
    });

    return c.json(
      { items: [...(await toEventJson(c.var.db, page.items, now))], nextCursor: page.nextCursor },
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
    const fence = await fenceColumns(c, body.locationId, body.requireLocation ?? false);
    const id = crypto.randomUUID();

    await c.var.db.transaction(async (tx) => {
      await tx.insert(eventTable).values({
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
        ...fence,
        secret: randomSecret(),
        createdBy: user?.id ?? null,
      });

      if (groupIds.length) {
        await tx.insert(eventGroup).values(
          pipe(
            groupIds,
            A.map((groupId) => ({ eventId: id, groupId })),
            F.toMutable,
          ),
        );
      }
    });

    const created = await findEvent(c.var.db, organizationId, id);
    if (!created) throw new Error("Insert returned no row");

    const [json] = await toEventJson(c.var.db, [created]);
    return c.json(json, 201);
  })
  .openapi(detailRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const now = new Date();

    await settle(c.var.db, organizationId, now);
    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const [json] = await toEventJson(c.var.db, [found], now);
    return c.json(json, 200);
  })
  .openapi(updateRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const startsAt = match(body.startsAt)
      .with(P.string.minLength(1), (startsAt) => new Date(startsAt))
      .otherwise(() => found.startsAt);
    const endsAt = match(body.endsAt)
      .with(P.string.minLength(1), (endsAt) => new Date(endsAt))
      .otherwise(() => found.endsAt);

    if (!validTimes(startsAt, endsAt)) {
      return c.json({ error: "The event must end after it starts." }, 400);
    }

    const groupIds = await pipe(
      O.fromNullable(body.groupIds),
      O.map(async (groupIds) => await validGroupIds(c, groupIds)),
      O.toNullable,
    );

    // A body that mentions neither field leaves the fence exactly as it was.
    const mentionsFence = body.locationId !== undefined || body.requireLocation !== undefined;
    const nextLocationId = match(body.locationId)
      .with(undefined, () => found.locationId)
      .otherwise((locationId) => locationId);

    const fence = await match(mentionsFence)
      .with(true, () =>
        fenceColumns(c, nextLocationId, body.requireLocation ?? found.requireLocation),
      )
      .otherwise(() => Promise.resolve(null));

    await c.var.db.transaction(async (tx) => {
      await tx
        .update(eventTable)
        .set({
          ...match(body.title)
            .with(undefined, () => ({}))
            .otherwise((title) => ({ title })),
          ...match(body.description)
            .with(undefined, () => ({}))
            .otherwise((description) => ({ description: description?.trim() || null })),
          startsAt,
          endsAt,
          ...match(body.lateAfterMinutes)
            .with(undefined, () => ({}))
            .otherwise((lateAfterMinutes) => ({ lateAfterMinutes })),
          ...match(body.opensBeforeMinutes)
            .with(undefined, () => ({}))
            .otherwise((opensBeforeMinutes) => ({ opensBeforeMinutes })),
          ...match(body.allowWalkIns)
            .with(undefined, () => ({}))
            .otherwise((allowWalkIns) => ({ allowWalkIns })),
          ...match(body.registrationOpen)
            .with(undefined, () => ({}))
            .otherwise((registrationOpen) => ({ registrationOpen })),
          ...match(body.registrationLimit)
            .with(undefined, () => ({}))
            .otherwise((registrationLimit) => ({ registrationLimit })),
          ...(fence ?? {}),
          updatedAt: new Date(),
        })
        .where(eq(eventTable.id, id));

      if (groupIds) {
        await tx.delete(eventGroup).where(eq(eventGroup.eventId, id));
        if (groupIds.length) {
          await tx.insert(eventGroup).values(
            pipe(
              groupIds,
              A.map((groupId) => ({ eventId: id, groupId })),
              F.toMutable,
            ),
          );
        }
      }
    });

    const updated = await findEvent(c.var.db, organizationId, id);
    if (!updated) throw new Error("Update returned no row");

    const [json] = await toEventJson(c.var.db, [updated]);
    return c.json(json, 200);
  })
  .openapi(removeRoute, async (c) => {
    if (roleBelow(c, "admin")) return c.json({ error: "This needs the admin role or higher" }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    await c.var.db.delete(eventTable).where(eq(eventTable.id, id));

    return c.json({ deleted: true as const }, 200);
  })
  .openapi(openRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const now = new Date();

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);
    if (statusOf(found, now) === "done") {
      return c.json({ error: "This event is over." }, 409);
    }

    if (!found.openedAt) {
      await c.var.db
        .update(eventTable)
        .set({ openedAt: now, updatedAt: now })
        .where(eq(eventTable.id, id));
    }

    const updated = await findEvent(c.var.db, organizationId, id);
    if (!updated) throw new Error("Update returned no row");

    const [json] = await toEventJson(c.var.db, [updated], now);
    return c.json(json, 200);
  })
  .openapi(closeRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const now = new Date();

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    if (!found.closedAt) {
      await finalizeEvent(
        c.var.db,
        found,
        match(now < found.endsAt)
          .with(true, () => now)
          .otherwise(() => found.endsAt),
      );
    }

    const updated = await findEvent(c.var.db, organizationId, id);
    if (!updated) throw new Error("Update returned no row");

    const [json] = await toEventJson(c.var.db, [updated], now);
    return c.json(json, 200);
  })
  .openapi(recordsRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    await settle(c.var.db, organizationId);
    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    return c.json([...(await eventRecords(c.var.db, id))], 200);
  })
  .openapi(setRecordRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id, personId } = c.req.valid("param");
    const { status, note } = c.req.valid("json");
    const user = c.get("user");

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const people = await c.var.db
      .select({ id: schema.person.id })
      .from(schema.person)
      .where(and(eq(schema.person.id, personId), eq(schema.person.organizationId, organizationId)))
      .limit(1);
    if (!people[0]) return c.json({ error: "Not found" }, 404);

    const current = await existingRecord(c.var.db, id, personId);
    const checkedInAt = match(status === "present" || status === "late")
      .with(true, () => current?.checkedInAt ?? new Date())
      .otherwise(() => null);

    await upsertRecord(c.var.db, {
      eventId: id,
      personId,
      status,
      method: "manual",
      checkedInAt,
      note: note ?? null,
      markedBy: user?.id ?? null,
    });

    const rows = await eventRecords(c.var.db, id);
    const record = A.getBy(rows, (row) => row.personId === personId);
    if (!record) throw new Error("Record vanished");

    return c.json(record, 200);
  })
  .openapi(qrTokenRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const now = new Date();

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const { token, expiresAt } = await createQrToken({ secret: found.secret, eventId: id, now });

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
    const { token, location } = c.req.valid("json");
    const now = new Date();

    if (!user) return c.json({ error: "Unauthorized" }, 401);

    // The scanned link may point at an event of another organization the
    // reader belongs to, so membership is checked on the event's own.
    const rows = await c.var.db.select().from(eventTable).where(eq(eventTable.id, id)).limit(1);
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

    const valid = await verifyQrToken({ secret: found.secret, eventId: id, token, now });
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
          eventTitle: found.title,
          personName: me.name,
          location: null,
        },
        200,
      );
    }

    const network = readNetwork(c.req.raw);
    const claim: LocationClaim | null = location ?? null;
    const decision = await checkLocation({
      db: c.var.db,
      eventId: id,
      personId: me.id,
      event: found,
      claim,
      network,
      method: "screen",
    });

    const attempt = {
      db: c.var.db,
      organizationId: found.organizationId,
      eventId: id,
      personId: me.id,
      method: "screen" as const,
      decision,
      claim,
      network,
      userAgent: c.req.header("user-agent") ?? null,
    };

    if (!decision.accepted) {
      await recordAttempt({ ...attempt, outcome: "refused" });

      return c.json(
        {
          error: decision.message ?? "You are not at this event's place.",
          location: {
            verdict: decision.verdict,
            distanceMeters: decision.columns.distanceMeters,
            flagged: decision.suspect,
          },
        },
        409,
      );
    }

    const record = await upsertRecord(c.var.db, {
      eventId: id,
      personId: me.id,
      status: statusForCheckIn(found, now),
      method: "screen",
      checkedInAt: now,
      location: decision.columns,
    });

    await recordAttempt({ ...attempt, outcome: "accepted" });

    return c.json(
      {
        status: record.status,
        checkedInAt: now.toISOString(),
        already: false,
        eventTitle: found.title,
        personName: me.name,
        // The member is told the fence passed, and never that they were
        // flagged. Naming the signal only teaches the next attempt.
        location: match(decision.required)
          .with(true, () => ({
            verdict: decision.verdict,
            distanceMeters: decision.columns.distanceMeters,
            flagged: false,
          }))
          .otherwise(() => null),
      },
      200,
    );
  })
  .openapi(reviewRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id, personId } = c.req.valid("param");
    const user = c.get("user");
    const now = new Date();

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    // The signals are never erased. Clearing the flag says an organizer read
    // them and let the record stand, which is itself worth keeping.
    const [updated] = await c.var.db
      .update(schema.attendanceRecord)
      .set({ reviewedAt: now, reviewedBy: user?.id ?? null, updatedAt: now })
      .where(
        and(
          eq(schema.attendanceRecord.eventId, id),
          eq(schema.attendanceRecord.personId, personId),
        ),
      )
      .returning();

    if (!updated) return c.json({ error: "Not found" }, 404);

    return c.json({ reviewedAt: now.toISOString() }, 200);
  })
  .openapi(scanRoute, async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");
    const { code, location } = c.req.valid("json");
    const now = new Date();

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const pass = parsePass(code.trim());
    if (!pass) return c.json({ error: "That is not an absqir pass." }, 400);
    if (pass.eventId !== id) return c.json({ error: "This pass is for another event." }, 400);
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
          eventTitle: found.title,
          personName: who.name,
          location: null,
        },
        200,
      );
    }

    // The reading belongs to the organizer's device, which is the door the
    // member is standing at, so it describes the member well enough. The
    // crowd and movement checks are switched off for it inside checkLocation.
    const network = readNetwork(c.req.raw);
    const claim: LocationClaim | null = location ?? null;
    const decision = await checkLocation({
      db: c.var.db,
      eventId: id,
      personId: who.id,
      event: found,
      claim,
      network,
      method: "scanner",
    });

    const attempt = {
      db: c.var.db,
      organizationId,
      eventId: id,
      personId: who.id,
      method: "scanner" as const,
      decision,
      claim,
      network,
      userAgent: c.req.header("user-agent") ?? null,
    };

    if (!decision.accepted) {
      await recordAttempt({ ...attempt, outcome: "refused" });

      return c.json(
        {
          error: decision.message ?? "This scanner is not at the event's place.",
          location: {
            verdict: decision.verdict,
            distanceMeters: decision.columns.distanceMeters,
            flagged: decision.suspect,
          },
        },
        409,
      );
    }

    const record = await upsertRecord(c.var.db, {
      eventId: id,
      personId: who.id,
      status: statusForCheckIn(found, now),
      method: "scanner",
      checkedInAt: now,
      location: decision.columns,
    });

    await recordAttempt({ ...attempt, outcome: "accepted" });

    return c.json(
      {
        status: record.status,
        checkedInAt: now.toISOString(),
        already: false,
        eventTitle: found.title,
        personName: who.name,
        location: match(decision.required)
          .with(true, () => ({
            verdict: decision.verdict,
            distanceMeters: decision.columns.distanceMeters,
            flagged: decision.suspect,
          }))
          .otherwise(() => null),
      },
      200,
    );
  })
  .get("/events/:id/records.csv", async (c) => {
    if (roleBelow(c, "organizer")) return c.json({ error: FORBIDDEN_MESSAGE }, 403);

    const organizationId = organizationIdOf(c);
    const id = c.req.param("id");

    const found = await findEvent(c.var.db, organizationId, id);
    if (!found) return c.json({ error: "Not found" }, 404);

    const records = await eventRecords(c.var.db, id);

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
