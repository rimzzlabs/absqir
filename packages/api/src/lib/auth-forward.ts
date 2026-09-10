import type { Context } from "hono";
import type { AppEnv } from "#src/types";

/**
 * A Better Auth call made on the caller's behalf can refresh the session
 * cookie (for example after the active organization changes). Copy every
 * Set-Cookie it produced onto our response so the browser sees the update.
 */
export function forwardCookies(c: Context<AppEnv>, headers: Headers | undefined): void {
  if (!headers) return;

  for (const value of headers.getSetCookie()) {
    c.header("Set-Cookie", value, { append: true });
  }
}
