import { authErrorOf, isRoleName } from "@absqir/auth";
import { schema } from "@absqir/db";
import type { OnboardingStep } from "@absqir/db/schema";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, eq, gt } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { forwardCookies } from "@/lib/auth-forward";
import { isSlug } from "@/lib/slug";
import type { AppEnv } from "@/types";

const { user, account, invitation, organization, member } = schema;

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
/** A 128px avatar as WebP or JPEG lands well under this. */
const MAX_AVATAR_BYTES = 48_000;
const AVATAR_DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

const stepSchema = z.enum(["profile", "avatar", "organization", "done"]);

const statusSchema = z.object({
  step: stepSchema,
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  hasPassword: z.boolean(),
  canCreateOrganizations: z.boolean(),
  membershipCount: z.number(),
  invitations: z.array(
    z.object({
      id: z.string(),
      organizationName: z.string(),
      role: z.string(),
    }),
  ),
});

const stepResult = z.object({ step: stepSchema });
const errorSchema = z.object({ error: z.string() });

const unauthorized = {
  description: "No active session",
  content: { "application/json": { schema: errorSchema } },
} as const;

const statusRoute = createRoute({
  method: "get",
  path: "/onboarding",
  tags: ["onboarding"],
  summary: "Where onboarding stands for the signed-in user",
  responses: {
    200: { description: "The status", content: { "application/json": { schema: statusSchema } } },
    401: unauthorized,
  },
});

const profileRoute = createRoute({
  method: "post",
  path: "/onboarding/profile",
  tags: ["onboarding"],
  summary: "Step 1: name and password",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().trim().min(1).max(80),
            /** Omitted when the account has a password already. */
            password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "The next step", content: { "application/json": { schema: stepResult } } },
    400: {
      description: "A password is needed",
      content: { "application/json": { schema: errorSchema } },
    },
    401: unauthorized,
  },
});

const avatarRoute = createRoute({
  method: "post",
  path: "/onboarding/avatar",
  tags: ["onboarding"],
  summary: "Step 2: profile picture, or skip",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            /** A small data URL. Null keeps the current picture, or none. */
            image: z.string().max(MAX_AVATAR_BYTES).regex(AVATAR_DATA_URL).nullable(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "The next step", content: { "application/json": { schema: stepResult } } },
    401: unauthorized,
  },
});

const organizationRoute = createRoute({
  method: "post",
  path: "/onboarding/organization",
  tags: ["onboarding"],
  summary: "Step 3a: create the first organization",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().trim().min(1).max(80),
            slug: z.string().trim().min(3).max(40),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Done. The new organization is active",
      content: {
        "application/json": { schema: stepResult.extend({ organizationId: z.string() }) },
      },
    },
    400: { description: "Bad slug", content: { "application/json": { schema: errorSchema } } },
    401: unauthorized,
    403: {
      description: "This account may not create organizations",
      content: { "application/json": { schema: errorSchema } },
    },
    409: { description: "Slug taken", content: { "application/json": { schema: errorSchema } } },
  },
});

const acceptRoute = createRoute({
  method: "post",
  path: "/onboarding/accept",
  tags: ["onboarding"],
  summary: "Step 3b: accept an invitation",
  request: {
    body: {
      content: { "application/json": { schema: z.object({ invitationId: z.string().min(1) }) } },
    },
  },
  responses: {
    200: {
      description: "Done. The organization is active",
      content: {
        "application/json": { schema: stepResult.extend({ organizationId: z.string() }) },
      },
    },
    401: unauthorized,
    404: {
      description: "No such invitation",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const finishRoute = createRoute({
  method: "post",
  path: "/onboarding/finish",
  tags: ["onboarding"],
  summary: "Step 3c: finish without an organization",
  responses: {
    200: { description: "Done", content: { "application/json": { schema: stepResult } } },
    401: unauthorized,
  },
});

function requireUser(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!c.get("user")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  };
}

function userOf(c: Context<AppEnv>) {
  const current = c.get("user");
  if (!current) throw new Error("requireUser did not run for this route");

  return current;
}

async function setStep(c: Context<AppEnv>, userId: string, step: OnboardingStep) {
  await c.var.db
    .update(user)
    .set({ onboardingStep: step, updatedAt: new Date() })
    .where(eq(user.id, userId));

  // The cookie cache still carries the old user row. A forced session read
  // re-issues the cookie, so the next page sees the new step at once.
  const refreshed = await c.var.auth.api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
    returnHeaders: true,
  });

  forwardCookies(c, refreshed.headers);
}

async function hasCredential(c: Context<AppEnv>, userId: string) {
  const rows = await c.var.db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  return rows.length > 0;
}

async function activate(c: Context<AppEnv>, organizationId: string) {
  const result = await c.var.auth.api.setActiveOrganization({
    body: { organizationId },
    headers: c.req.raw.headers,
    returnHeaders: true,
  });

  forwardCookies(c, result.headers);
}

const app = new OpenAPIHono<AppEnv>();

app.use("/onboarding", requireUser());
app.use("/onboarding/*", requireUser());

export const onboardingRoutes = app
  .openapi(statusRoute, async (c) => {
    const current = userOf(c);
    const db = c.var.db;

    const [rows, memberships, invitations] = await Promise.all([
      db.select().from(user).where(eq(user.id, current.id)).limit(1),
      db.select({ value: count() }).from(member).where(eq(member.userId, current.id)),
      db
        .select({ id: invitation.id, organizationName: organization.name, role: invitation.role })
        .from(invitation)
        .innerJoin(organization, eq(organization.id, invitation.organizationId))
        .where(
          and(
            eq(invitation.email, current.email.toLowerCase()),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        ),
    ]);

    const row = rows[0];
    if (!row) return c.json({ error: "Unauthorized" }, 401);

    return c.json(
      {
        step: row.onboardingStep,
        name: row.name,
        email: row.email,
        image: row.image ?? null,
        hasPassword: await hasCredential(c, row.id),
        canCreateOrganizations: row.canCreateOrganizations,
        membershipCount: memberships[0]?.value ?? 0,
        invitations: invitations.map((row) => ({
          id: row.id,
          organizationName: row.organizationName,
          role: row.role ?? "member",
        })),
      },
      200,
    );
  })
  .openapi(profileRoute, async (c) => {
    const current = userOf(c);
    const { name, password } = c.req.valid("json");

    const credential = await hasCredential(c, current.id);

    if (!credential) {
      if (!password) {
        return c.json({ error: "Choose a password to finish the account." }, 400);
      }

      await c.var.auth.api.setPassword({
        body: { newPassword: password },
        headers: c.req.raw.headers,
      });
    }

    await c.var.db.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, current.id));

    await setStep(c, current.id, "avatar");

    return c.json({ step: "avatar" as const }, 200);
  })
  .openapi(avatarRoute, async (c) => {
    const current = userOf(c);
    const { image } = c.req.valid("json");

    if (image) {
      await c.var.db
        .update(user)
        .set({ image, updatedAt: new Date() })
        .where(eq(user.id, current.id));
    }

    await setStep(c, current.id, "organization");

    return c.json({ step: "organization" as const }, 200);
  })
  .openapi(organizationRoute, async (c) => {
    const current = userOf(c);
    const { name, slug } = c.req.valid("json");

    if (!isSlug(slug)) {
      return c.json({ error: "Use lowercase letters, digits, and hyphens for the slug." }, 400);
    }

    try {
      const created = await c.var.auth.api.createOrganization({
        body: { name, slug },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });

      forwardCookies(c, created.headers);

      const organizationId = created.response?.id;
      if (!organizationId) throw new Error("createOrganization returned no organization");

      await activate(c, organizationId);
      await setStep(c, current.id, "done");

      return c.json({ step: "done" as const, organizationId }, 200);
    } catch (error) {
      const known = authErrorOf(error);
      if (!known) throw error;

      if (known.status === 403) return c.json({ error: known.message }, 403);
      if (known.status === 400 && /slug/i.test(known.message)) {
        return c.json({ error: "That slug is taken. Try another." }, 409);
      }

      return c.json({ error: known.message }, 400);
    }
  })
  .openapi(acceptRoute, async (c) => {
    const current = userOf(c);
    const { invitationId } = c.req.valid("json");

    const rows = await c.var.db
      .select({ organizationId: invitation.organizationId, role: invitation.role })
      .from(invitation)
      .where(
        and(
          eq(invitation.id, invitationId),
          eq(invitation.email, current.email.toLowerCase()),
          eq(invitation.status, "pending"),
          gt(invitation.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const found = rows[0];
    if (!found || (found.role && !isRoleName(found.role))) {
      return c.json({ error: "This invitation is not for this account, or it expired." }, 404);
    }

    const accepted = await c.var.auth.api.acceptInvitation({
      body: { invitationId },
      headers: c.req.raw.headers,
      returnHeaders: true,
    });

    forwardCookies(c, accepted.headers);

    await activate(c, found.organizationId);
    await setStep(c, current.id, "done");

    return c.json({ step: "done" as const, organizationId: found.organizationId }, 200);
  })
  .openapi(finishRoute, async (c) => {
    const current = userOf(c);

    await setStep(c, current.id, "done");

    return c.json({ step: "done" as const }, 200);
  });
