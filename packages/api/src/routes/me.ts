import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "@/types";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  emailVerified: z.boolean(),
});

const errorSchema = z.object({ error: z.string() });

const route = createRoute({
  method: "get",
  path: "/me",
  tags: ["auth"],
  summary: "Read the signed-in user",
  responses: {
    200: {
      description: "The signed-in user",
      content: { "application/json": { schema: userSchema } },
    },
    401: {
      description: "No active session",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

export const meRoutes = new OpenAPIHono<AppEnv>().openapi(route, (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      emailVerified: user.emailVerified,
    },
    200,
  );
});
