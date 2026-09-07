import { app } from "@absqir/api";
import { getRuntime } from "@app-runtime";
import type { APIRoute } from "astro";

export const prerender = false;

// Everything under /api goes to Hono with the platform's bindings attached.
export const ALL: APIRoute = (context) => {
  const runtime = getRuntime(context.locals);

  return app.fetch(context.request, runtime.bindings, runtime.executionCtx);
};
