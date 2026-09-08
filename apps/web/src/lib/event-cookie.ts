import { EVENT_COOKIE } from "@absqir/auth";
import type { AstroCookies } from "astro";

/** Long enough to sign up and come back, short enough to forget on its own. */
const MAX_AGE_SECONDS = 60 * 60;

/**
 * Remembers which open session brought a stranger here. The sign-up door on
 * the server reads it before it lets a new account through.
 */
export function setEventCookie(cookies: AstroCookies, sessionId: string): void {
  cookies.set(EVENT_COOKIE, sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: MAX_AGE_SECONDS,
  });
}
