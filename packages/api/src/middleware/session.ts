import { DEFAULT_LOCALE, isLocale, localeFromHeader, translatorFor } from "@absqir/i18n";
import type { MiddlewareHandler } from "hono";
import { match, P } from "ts-pattern";
import { createRequestContext } from "#src/context";
import type { AppEnv } from "#src/types";

/** Builds the per-invocation context, then reads the session from the cookie. */
export function requestContext(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const origin = new URL(c.req.url).origin;
    const { db, auth, mailer, close } = createRequestContext(
      c.env,
      origin,
      c.req.header("origin"),
      c.req.header("accept-language"),
    );

    c.set("db", db);
    c.set("auth", auth);
    c.set("mailer", mailer);

    // A refusal before the session is read still has to reach somebody, so
    // the language starts with what the browser asks for. currentSession
    // replaces it with the account's own choice.
    const asked = localeFromHeader(c.req.header("accept-language")) ?? DEFAULT_LOCALE;
    c.set("locale", asked);
    c.set("t", translatorFor(asked));

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

    const locale = match(data?.user.locale)
      .with(P.when(isLocale), (locale) => locale)
      .otherwise(() => c.var.locale);

    c.set("locale", locale);
    c.set("t", translatorFor(locale));

    await next();
  };
}
