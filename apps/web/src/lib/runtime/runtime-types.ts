import type { ApiBindings } from "@absqir/api";
import type { ExecutionContext } from "hono";

/**
 * What a page or API route needs from the platform it runs on. The Vite alias
 * `@app-runtime` resolves to the Cloudflare or the Node implementation, picked
 * by DEPLOY_TARGET at build time.
 */
export interface AppRuntime {
  bindings: ApiBindings;
  executionCtx: ExecutionContext;
}
