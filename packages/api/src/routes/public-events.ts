import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { match } from "ts-pattern";
import { forwardCookies } from "#src/lib/auth-forward";
import { statusOf } from "#src/lib/event-status";
import { personForUser } from "#src/lib/events";
import {
  findPublicEvent,
  registerForEvent,
  registrationCount,
  takesRegistrations,
} from "#src/lib/public-events";
import type { AppEnv } from "#src/types";

const { eventRegistration } = schema;

const publicEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  organizationName: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum(["scheduled", "running", "done"]),
  /** The page still takes people. */
  open: z.boolean(),
  limit: z.number().nullable(),
  registered: z.number(),
  seatsLeft: z.number().nullable(),
  /** The caller is on the list. Always false when signed out. */
  mine: z.boolean(),
  /** The caller is signed in. */
  signedIn: z.boolean(),
});

const errorSchema = z.object({ error: z.string() });
const idParam = z.object({ id: z.string() });

const notFound = {
  description: "No such event, or it is not public",
  content: { "application/json": { schema: errorSchema } },
} as const;

const detailRoute = createRoute({
  method: "get",
  path: "/public/events/{id}",
  tags: ["public"],
  summary: "The public face of an open event",
  description: "Works signed out. An event that never opened registration is not found here.",
  request: { params: idParam },
  responses: {
    200: {
      description: "The event",
      content: { "application/json": { schema: publicEventSchema } },
    },
    404: notFound,
  },
});

const registerRoute = createRoute({
  method: "post",
  path: "/public/events/{id}/register",
  tags: ["public"],
  summary: "Put yourself on the list. Joins the organization when needed",
  request: { params: idParam },
  responses: {
    200: {
      description: "On the list",
      content: { "application/json": { schema: publicEventSchema } },
    },
    401: { description: "Sign in first", content: { "application/json": { schema: errorSchema } } },
    404: notFound,
    409: {
      description: "Registration closed, the event is over, or it is full",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const withdrawRoute = createRoute({
  method: "delete",
  path: "/public/events/{id}/register",
  tags: ["public"],
  summary: "Take yourself off the list, before the event starts",
  request: { params: idParam },
  responses: {
    200: {
      description: "Off the list",
      content: { "application/json": { schema: publicEventSchema } },
    },
    401: { description: "Sign in first", content: { "application/json": { schema: errorSchema } } },
    404: notFound,
    409: {
      description: "The event already started",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const REASONS = {
  closed: "Registration is closed for this event.",
  over: "This event is over.",
  full: "This event is full.",
} as const;

export const publicEventRoutes = new OpenAPIHono<AppEnv>()
  .openapi(detailRoute, async (c) => {
    const { id } = c.req.valid("param");
    const json = await eventJson(c, id);
    if (!json) return c.json({ error: "Not found" }, 404);

    return c.json(json, 200);
  })
  .openapi(registerRoute, async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user");
    if (!user) return c.json({ error: "Sign in first." }, 401);

    const found = await findPublicEvent(c.var.db, id);
    if (!found?.event.registrationOpen) return c.json({ error: "Not found" }, 404);

    const result = await registerForEvent(c.var.db, { event: found.event, user });
    if (!result.ok) return c.json({ error: REASONS[result.reason] }, 409);

    // The new membership becomes the active organization, so the dashboard
    // opens on the right one.
    const authSession = c.get("session");
    if (authSession && authSession.activeOrganizationId !== found.event.organizationId) {
      const switched = await c.var.auth.api.setActiveOrganization({
        body: { organizationId: found.event.organizationId },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });
      forwardCookies(c, switched.headers);
    }

    const json = await eventJson(c, id);
    if (!json) return c.json({ error: "Not found" }, 404);

    return c.json(json, 200);
  })
  .openapi(withdrawRoute, async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user");
    if (!user) return c.json({ error: "Sign in first." }, 401);

    const found = await findPublicEvent(c.var.db, id);
    if (!found?.event.registrationOpen) return c.json({ error: "Not found" }, 404);
    if (statusOf(found.event) !== "scheduled") {
      return c.json({ error: "The event already started." }, 409);
    }

    const me = await personForUser(c.var.db, found.event.organizationId, user.id);
    if (me) {
      await c.var.db
        .delete(eventRegistration)
        .where(and(eq(eventRegistration.eventId, id), eq(eventRegistration.personId, me.id)));
    }

    const json = await eventJson(c, id);
    if (!json) return c.json({ error: "Not found" }, 404);

    return c.json(json, 200);
  });

async function eventJson(c: Context<AppEnv>, id: string) {
  const found = await findPublicEvent(c.var.db, id);
  if (!found?.event.registrationOpen) return null;

  const { event, organizationName } = found;
  const now = new Date();
  const registered = await registrationCount(c.var.db, id);
  const user = c.get("user");

  let mine = false;
  if (user) {
    const me = await personForUser(c.var.db, event.organizationId, user.id);
    if (me) {
      const rows = await c.var.db
        .select({ personId: eventRegistration.personId })
        .from(eventRegistration)
        .where(and(eq(eventRegistration.eventId, id), eq(eventRegistration.personId, me.id)))
        .limit(1);
      mine = rows.length > 0;
    }
  }

  return {
    id: event.id,
    title: event.title,
    description: event.description ?? null,
    organizationName,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    status: statusOf(event, now),
    open: takesRegistrations(event, now),
    limit: event.registrationLimit ?? null,
    registered,
    seatsLeft: match(event.registrationLimit)
      .with(null, () => null)
      .otherwise((registrationLimit) => Math.max(0, registrationLimit - registered)),
    mine,
    signedIn: user !== null,
  };
}
