import { schema } from "@absqir/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, eq, gt } from "drizzle-orm";
import { parseEnv } from "@/env";
import type { AppEnv } from "@/types";

const { user, account, invitation } = schema;

const lookupBody = z.object({ email: z.email().max(254) });

const lookupResult = z.object({
  /** An account with this email exists. */
  exists: z.boolean(),
  /** That account can sign in with a password. Off for an unfinished sign-up. */
  hasPassword: z.boolean(),
  /** A new account may be created for this email right now. */
  canRegister: z.boolean(),
});

const lookupRoute = createRoute({
  method: "post",
  path: "/auth-flow/lookup",
  tags: ["auth"],
  summary: "Find out which sign-in step comes next for an email",
  description:
    "The single sign-in door asks for the email first. This tells the page whether to ask for a password, send a code, or explain that the email needs an invitation. Rate limited per IP.",
  request: { body: { content: { "application/json": { schema: lookupBody } } } },
  responses: {
    200: {
      description: "The next step",
      content: { "application/json": { schema: lookupResult } },
    },
  },
});

export const authFlowRoutes = new OpenAPIHono<AppEnv>().openapi(lookupRoute, async (c) => {
  const email = c.req.valid("json").email.trim().toLowerCase();
  const db = c.var.db;
  const env = parseEnv(c.env);

  const users = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  const found = users[0];

  if (found) {
    const credentials = await db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, found.id), eq(account.providerId, "credential")))
      .limit(1);

    return c.json({ exists: true, hasPassword: credentials.length > 0, canRegister: false }, 200);
  }

  if (env.REGISTRATION_OPEN) {
    return c.json({ exists: false, hasPassword: false, canRegister: true }, 200);
  }

  const [total] = await db.select({ value: count() }).from(user);

  if ((total?.value ?? 0) === 0) {
    return c.json({ exists: false, hasPassword: false, canRegister: true }, 200);
  }

  const invited = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.email, email),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return c.json({ exists: false, hasPassword: false, canRegister: invited.length > 0 }, 200);
});
