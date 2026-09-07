import { env } from "cloudflare:workers";
import { app } from "@absqir/api";
import type { APIRoute } from "astro";

export const prerender = false;

// Everything under /api goes to Hono with the Worker bindings attached.
export const ALL: APIRoute = (context) => app.fetch(context.request, env, context.locals.cfContext);
