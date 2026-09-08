import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { parseEnv } from "@/env";
import { runTick } from "@/lib/tick";
import type { AppEnv } from "@/types";

const errorSchema = z.object({ error: z.string() });

const tickRoute = createRoute({
  method: "post",
  path: "/tick",
  tags: ["operations"],
  summary: "Run the heartbeat: schedules, closings and reminders",
  description:
    "For a scheduler outside the app, such as a Cloudflare Cron Trigger or a " +
    "cron entry on a server. Send the CRON_SECRET as a bearer token, and " +
    "content-type: application/json, because the site rejects a cross-site form " +
    "post. The route answers 404 while CRON_SECRET is unset, because a Node " +
    "self-host runs the same work on a timer inside the process.",
  responses: {
    200: {
      description: "What the tick did",
      content: {
        "application/json": {
          schema: z.object({ organizations: z.number(), notifications: z.number() }),
        },
      },
    },
    401: {
      description: "Wrong or missing token",
      content: { "application/json": { schema: errorSchema } },
    },
    404: {
      description: "The instance has no CRON_SECRET",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const app = new OpenAPIHono<AppEnv>();

export const tickRoutes = app.openapi(tickRoute, async (c) => {
  const env = parseEnv(c.env);
  if (!env.CRON_SECRET) return c.json({ error: "Not found" }, 404);

  const token = c.req.header("authorization")?.replace(/^Bearer /i, "");
  if (token !== env.CRON_SECRET) return c.json({ error: "Unauthorized" }, 401);

  const result = await runTick(c.var.db, {
    mailer: c.var.mailer,
    origin: env.APP_URL ?? new URL(c.req.url).origin,
  });

  return c.json(result, 200);
});
