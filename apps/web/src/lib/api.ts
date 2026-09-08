import type { AppType } from "@absqir/api";
import { hc } from "hono/client";

// Same origin as the site, so the base is a plain path. Call it from the
// browser only: a relative fetch has no origin to resolve against on the server.
export const api = hc<AppType>("/").api;

/** What hono's typed client and a plain fetch Response have in common. */
interface JsonResponse {
  json(): Promise<unknown>;
}

/**
 * Turns a failed API response into an Error with the server's message. Every
 * absqir route answers `{ error }` on failure; Better Auth answers `{ message }`.
 */
export async function apiError(response: JsonResponse, fallback: string): Promise<Error> {
  try {
    const body: unknown = await response.json();

    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      const message = record.error ?? record.message;
      if (typeof message === "string" && message.length > 0) return new Error(message);
    }
  } catch {
    // Not JSON. The fallback covers it.
  }

  return new Error(fallback);
}
