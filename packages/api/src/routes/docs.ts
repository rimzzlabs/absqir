import type { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import type { MiddlewareHandler } from "hono";
import { docsEnabled, parseEnv } from "@/env";
import type { AppEnv } from "@/types";

/**
 * The OpenAPI document lists every route and every schema, so it stays off in
 * production unless ENABLE_DOCS says otherwise.
 */
export function mountDocs(app: OpenAPIHono<AppEnv>) {
  const guard: MiddlewareHandler<AppEnv> = async (c, next) => {
    if (!docsEnabled(parseEnv(c.env))) {
      return c.json({ error: "Not found" }, 404);
    }

    await next();
  };

  app.use("/openapi.json", guard);
  app.use("/reference", guard);

  app.doc31("/openapi.json", (c) => ({
    openapi: "3.1.0",
    info: { title: "absqir API", version: "0.0.0" },
    servers: [{ url: new URL(c.req.url).origin }],
  }));

  app.get("/reference", Scalar({ url: "/api/openapi.json", pageTitle: "absqir API" }));
}
