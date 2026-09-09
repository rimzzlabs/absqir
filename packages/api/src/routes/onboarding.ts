import { authErrorOf, isRoleName } from "@absqir/auth";
import { schema } from "@absqir/db";
import { findOrganizationForEmail, findPendingJoinRequest } from "@absqir/db/domains";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, eq, gt, ne } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { forwardCookies } from "@/lib/auth-forward";
import { avatarSchema } from "@/lib/avatar";
import { findPublicSession, registerForSession } from "@/lib/events";
import { activateOrganization, setOnboardingStep } from "@/lib/onboarding";
import { isSlug } from "@/lib/slug";
import type { AppEnv } from "@/types";

const { user, account, invitation, organization, member } = schema;

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

const stepSchema = z.enum(["profile", "avatar", "organization", "done"]);

const statusSchema = z.object({
  step: stepSchema,
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  hasPassword: z.boolean(),
  /** The providers already linked to this account, such as "github". */
  linkedProviders: z.array(z.string()),
  canCreateOrganizations: z.boolean(),
  membershipCount: z.number(),
  /**
   * The workspace that claimed this account's email domain and takes people
   * from it. Named only here, behind a session: at the sign-in door the
   * address is not proven yet.
   */
  workspace: z
    .object({
      organizationId: z.string(),
      name: z.string(),
      slug: z.string(),
      logo: z.string().nullable(),
      domain: z.string(),
      /** `auto` joins on one press. `request` waits for an admin. */
      joinPolicy: z.enum(["request", "auto"]),
    })
    .nullable(),
  /** The request this account already sent, if it waits for one. */
  joinRequest: z
    .object({
      id: z.string(),
      organizationName: z.string(),
      createdAt: z.string(),
    })
    .nullable(),
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
            image: avatarSchema,
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

const eventRoute = createRoute({
  method: "post",
  path: "/onboarding/event",
  tags: ["onboarding"],
  summary: "Step 3d: join through an open session's public page",
  description: "Joins the organization as a member, registers for the session, and finishes.",
  request: {
    body: {
      content: { "application/json": { schema: z.object({ sessionId: z.string().min(1) }) } },
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
      description: "No such open session",
      content: { "application/json": { schema: errorSchema } },
    },
    409: {
      description: "The session is over or full",
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

async function hasCredential(c: Context<AppEnv>, userId: string) {
  const rows = await c.var.db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  return rows.length > 0;
}

/** Every provider signed in as this account, without the password row. */
async function linkedProvidersOf(c: Context<AppEnv>, userId: string) {
  const rows = await c.var.db
    .select({ providerId: account.providerId })
    .from(account)
    .where(and(eq(account.userId, userId), ne(account.providerId, "credential")));

  return rows.map((row) => row.providerId);
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

    const match = await findOrganizationForEmail(db, row.email);
    const workspace =
      match && match.joinPolicy !== "closed"
        ? {
            organizationId: match.organizationId,
            name: match.name,
            slug: match.slug,
            logo: match.logo,
            joinPolicy: match.joinPolicy,
            domain: match.domain,
          }
        : null;

    const open = workspace
      ? await findPendingJoinRequest(db, {
          organizationId: workspace.organizationId,
          userId: row.id,
        })
      : null;

    return c.json(
      {
        step: row.onboardingStep,
        name: row.name,
        email: row.email,
        image: row.image ?? null,
        hasPassword: await hasCredential(c, row.id),
        linkedProviders: await linkedProvidersOf(c, row.id),
        canCreateOrganizations: row.canCreateOrganizations,
        membershipCount: memberships[0]?.value ?? 0,
        workspace,
        joinRequest: open
          ? {
              id: open.id,
              organizationName: workspace?.name ?? "",
              createdAt: open.createdAt.toISOString(),
            }
          : null,
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
      // A provider is a credential too. An account that arrived through one
      // needs no password here: an emailed code signs it in either way, and
      // the account page offers a password later.
      const linked = await linkedProvidersOf(c, current.id);

      if (!password && linked.length === 0) {
        return c.json({ error: "Choose a password to finish the account." }, 400);
      }

      if (password) {
        await c.var.auth.api.setPassword({
          body: { newPassword: password },
          headers: c.req.raw.headers,
        });
      }
    }

    await c.var.db.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, current.id));

    await setOnboardingStep(c, current.id, "avatar");

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

    await setOnboardingStep(c, current.id, "organization");

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

      await activateOrganization(c, organizationId);
      await setOnboardingStep(c, current.id, "done");

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

    await activateOrganization(c, found.organizationId);
    await setOnboardingStep(c, current.id, "done");

    return c.json({ step: "done" as const, organizationId: found.organizationId }, 200);
  })
  .openapi(eventRoute, async (c) => {
    const current = userOf(c);
    const { sessionId } = c.req.valid("json");

    const found = await findPublicSession(c.var.db, sessionId);
    if (!found?.session.registrationOpen) {
      return c.json({ error: "This event does not take registrations." }, 404);
    }

    const result = await registerForSession(c.var.db, { session: found.session, user: current });
    if (!result.ok) {
      const message = result.reason === "full" ? "This event is full." : "This event is over.";
      return c.json({ error: message }, 409);
    }

    await activateOrganization(c, found.session.organizationId);
    await setOnboardingStep(c, current.id, "done");

    return c.json({ step: "done" as const, organizationId: found.session.organizationId }, 200);
  })
  .openapi(finishRoute, async (c) => {
    const current = userOf(c);

    await setOnboardingStep(c, current.id, "done");

    return c.json({ step: "done" as const }, 200);
  });
