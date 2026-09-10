import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "#src/types";

/**
 * Better Auth owns every path under /api/auth. It reads and writes the session
 * cookie itself, so the request is handed over untouched.
 */
export const authRoutes = new OpenAPIHono<AppEnv>().on(["GET", "POST"], "/auth/*", (c) =>
  c.var.auth.handler(c.req.raw),
);
