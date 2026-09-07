import type { AppType } from "@absqir/api";
import { hc } from "hono/client";

// Same origin as the site, so the base is a plain path. Call it from the
// browser only: a relative fetch has no origin to resolve against on the server.
export const api = hc<AppType>("/").api;
