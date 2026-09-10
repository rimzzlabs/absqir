import { schema } from "@absqir/db";
import { domainOpensRegistration } from "@absqir/db/domains";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, eq, gt } from "drizzle-orm";
import { parseEnv } from "#src/env";
import type { AppEnv } from "#src/types";

const { user, account, invitation, attendanceSession } = schema;

const lookupBody = z.object({
  email: z.email().max(254),
  /** The open session whose public page sent the visitor here. */
  eventId: z.string().max(64).optional(),
});

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
    "The single sign-in door asks for the email first. This tells the page whether to ask for a password, send a code, or explain that the email needs an invitation. A workspace that claimed the email domain also opens the door, and the reply never names it. Rate limited per IP.",
  request: { body: { content: { "application/json": { schema: lookupBody } } } },
  responses: {
    200: {
      description: "The next step",
      content: { "application/json": { schema: lookupResult } },
    },
  },
});

export const authFlowRoutes = new OpenAPIHono<AppEnv>().openapi(lookupRoute, async (c) => {
  const body = c.req.valid("json");
  const email = body.email.trim().toLowerCase();
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

  if (body.eventId) {
    const open = await db
      .select({ id: attendanceSession.id })
      .from(attendanceSession)
      .where(
        and(
          eq(attendanceSession.id, body.eventId),
          eq(attendanceSession.registrationOpen, true),
          gt(attendanceSession.endsAt, new Date()),
        ),
      )
      .limit(1);

    if (open.length > 0) {
      return c.json({ exists: false, hasPassword: false, canRegister: true }, 200);
    }
  }

  // A workspace that proved it owns this domain and takes people from it.
  // The reply never names the workspace: whoever asks has not proved yet that
  // the address is theirs. The workspace card waits until they are signed in.
  if (await domainOpensRegistration(db, email)) {
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
