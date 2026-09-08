import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { forwardCookies } from "@/lib/auth-forward";
import {
  findPublicSession,
  registerForSession,
  registrationCount,
  takesRegistrations,
} from "@/lib/events";
import { statusOf } from "@/lib/session-status";
import { personForUser } from "@/lib/sessions";
import type { AppEnv } from "@/types";

const { sessionRegistration } = schema;

const eventSchema = z.object({
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
  description: "No such session, or it is not public",
  content: { "application/json": { schema: errorSchema } },
} as const;

const detailRoute = createRoute({
  method: "get",
  path: "/events/{id}",
  tags: ["events"],
  summary: "The public face of an open session",
  description: "Works signed out. A session that never opened registration is not found here.",
  request: { params: idParam },
  responses: {
    200: { description: "The event", content: { "application/json": { schema: eventSchema } } },
    404: notFound,
  },
});

const registerRoute = createRoute({
  method: "post",
  path: "/events/{id}/register",
  tags: ["events"],
  summary: "Put yourself on the list. Joins the organization when needed",
  request: { params: idParam },
  responses: {
    200: { description: "On the list", content: { "application/json": { schema: eventSchema } } },
    401: { description: "Sign in first", content: { "application/json": { schema: errorSchema } } },
    404: notFound,
    409: {
      description: "Registration closed, the session is over, or it is full",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const withdrawRoute = createRoute({
  method: "delete",
  path: "/events/{id}/register",
  tags: ["events"],
  summary: "Take yourself off the list, before the session starts",
  request: { params: idParam },
  responses: {
    200: { description: "Off the list", content: { "application/json": { schema: eventSchema } } },
    401: { description: "Sign in first", content: { "application/json": { schema: errorSchema } } },
    404: notFound,
    409: {
      description: "The session already started",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const REASONS = {
  closed: "Registration is closed for this session.",
  over: "This session is over.",
  full: "This session is full.",
} as const;

export const eventRoutes = new OpenAPIHono<AppEnv>()
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

    const found = await findPublicSession(c.var.db, id);
    if (!found?.session.registrationOpen) return c.json({ error: "Not found" }, 404);

    const result = await registerForSession(c.var.db, { session: found.session, user });
    if (!result.ok) return c.json({ error: REASONS[result.reason] }, 409);

    // The new membership becomes the active organization, so the dashboard
    // opens on the right one.
    const session = c.get("session");
    if (session && session.activeOrganizationId !== found.session.organizationId) {
      const switched = await c.var.auth.api.setActiveOrganization({
        body: { organizationId: found.session.organizationId },
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

    const found = await findPublicSession(c.var.db, id);
    if (!found?.session.registrationOpen) return c.json({ error: "Not found" }, 404);
    if (statusOf(found.session) !== "scheduled") {
      return c.json({ error: "The session already started." }, 409);
    }

    const me = await personForUser(c.var.db, found.session.organizationId, user.id);
    if (me) {
      await c.var.db
        .delete(sessionRegistration)
        .where(and(eq(sessionRegistration.sessionId, id), eq(sessionRegistration.personId, me.id)));
    }

    const json = await eventJson(c, id);
    if (!json) return c.json({ error: "Not found" }, 404);

    return c.json(json, 200);
  });

async function eventJson(c: Context<AppEnv>, id: string) {
  const found = await findPublicSession(c.var.db, id);
  if (!found?.session.registrationOpen) return null;

  const { session, organizationName } = found;
  const now = new Date();
  const registered = await registrationCount(c.var.db, id);
  const user = c.get("user");

  let mine = false;
  if (user) {
    const me = await personForUser(c.var.db, session.organizationId, user.id);
    if (me) {
      const rows = await c.var.db
        .select({ personId: sessionRegistration.personId })
        .from(sessionRegistration)
        .where(and(eq(sessionRegistration.sessionId, id), eq(sessionRegistration.personId, me.id)))
        .limit(1);
      mine = rows.length > 0;
    }
  }

  return {
    id: session.id,
    title: session.title,
    description: session.description ?? null,
    organizationName,
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    status: statusOf(session, now),
    open: takesRegistrations(session, now),
    limit: session.registrationLimit ?? null,
    registered,
    seatsLeft:
      session.registrationLimit === null
        ? null
        : Math.max(0, session.registrationLimit - registered),
    mine,
    signedIn: user !== null,
  };
}
