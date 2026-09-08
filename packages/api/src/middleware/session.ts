import type { MiddlewareHandler } from "hono";
import { createRequestContext } from "@/context";
import type { AppEnv } from "@/types";

/** Builds the per-invocation context, then reads the session from the cookie. */
export function requestContext(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const origin = new URL(c.req.url).origin;
    const { db, auth, mailer, close } = createRequestContext(c.env, origin);

    c.set("db", db);
    c.set("auth", auth);
    c.set("mailer", mailer);

    try {
      await next();
    } finally {
      c.executionCtx.waitUntil(close());
    }
  };
}

export function currentSession(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const data = await c.var.auth.api.getSession({ headers: c.req.raw.headers });

    c.set("user", data?.user ?? null);
    c.set("session", data?.session ?? null);

    await next();
  };
}
