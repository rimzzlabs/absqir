import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "#src/types";

const route = createRoute({
  method: "get",
  path: "/health",
  tags: ["system"],
  summary: "Liveness probe",
  responses: {
    200: {
      description: "The service is up",
      content: {
        "application/json": { schema: z.object({ status: z.literal("ok") }) },
      },
    },
  },
});

export const healthRoutes = new OpenAPIHono<AppEnv>().openapi(route, (c) =>
  c.json({ status: "ok" as const }, 200),
);
