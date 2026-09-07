import { env } from "cloudflare:workers";
import type { AppRuntime } from "@/lib/runtime/runtime-types";

export function getRuntime(locals: App.Locals): AppRuntime {
  return { bindings: env, executionCtx: locals.cfContext };
}
