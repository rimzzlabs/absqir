import { NOTIFICATION_TYPES } from "@absqir/db/schema";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { notificationStream } from "#src/lib/notification-stream";
import {
  listNotifications,
  markRead,
  toNotificationJson,
  unreadCount,
} from "#src/lib/notifications";
import { organizationGuard, organizationIdOf } from "#src/lib/org-access";
import type { AppEnv } from "#src/types";

const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  body: z.string().nullable(),
  href: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

const errorSchema = z.object({ error: z.string() });

const unauthorized = {
  description: "No active session",
  content: { "application/json": { schema: errorSchema } },
} as const;
const forbidden = {
  description: "No organization membership",
  content: { "application/json": { schema: errorSchema } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/notifications",
  tags: ["notifications"],
  summary: "My notifications in this organization, newest first",
  request: { query: z.object({ scope: z.enum(["all", "unread"]).optional() }) },
  responses: {
    200: {
      description: "Notifications",
      content: { "application/json": { schema: z.array(notificationSchema) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const countRoute = createRoute({
  method: "get",
  path: "/notifications/unread-count",
  tags: ["notifications"],
  summary: "How many wait, for the badge in the header",
  responses: {
    200: {
      description: "The count",
      content: { "application/json": { schema: z.object({ count: z.number() }) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const readRoute = createRoute({
  method: "post",
  path: "/notifications/read",
  tags: ["notifications"],
  summary: "Mark the given notifications read, or every one of them",
  request: {
    body: {
      content: {
        "application/json": {
          /** No ids means all of mine. */
          schema: z.object({ ids: z.array(z.string()).max(200).nullable().optional() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "How many changed",
      content: { "application/json": { schema: z.object({ read: z.number() }) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

const app = new OpenAPIHono<AppEnv>();

app.use("/notifications", organizationGuard());
app.use("/notifications/*", organizationGuard());

// Server-sent events. Off the OpenAPI chain: a stream has no JSON body to
// describe, and the typed client cannot consume one anyway.
app.get("/notifications/stream", (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  return notificationStream(c, user.id, organizationIdOf(c));
});

export const notificationRoutes = app
  .openapi(listRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { scope } = c.req.valid("query");
    const rows = await listNotifications(c.var.db, user.id, organizationId, scope ?? "all");

    return c.json(rows.map(toNotificationJson), 200);
  })
  .openapi(countRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    return c.json({ count: await unreadCount(c.var.db, user.id, organizationId) }, 200);
  })
  .openapi(readRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { ids } = c.req.valid("json");
    const read = await markRead(c.var.db, user.id, organizationId, ids ?? null);

    return c.json({ read }, 200);
  });
