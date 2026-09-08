import { isRoleName } from "@absqir/auth";
import { schema } from "@absqir/db";
import { isNotificationChannel, isOnboardingStep, NOTIFICATION_CHANNELS } from "@absqir/db/schema";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { forwardCookies } from "@/lib/auth-forward";
import { avatarSchema } from "@/lib/avatar";
import type { AppEnv } from "@/types";

const { member, organization, user } = schema;

const membershipSchema = z.object({
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  role: z.enum(["owner", "admin", "organizer", "member"]),
});

const meSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  emailVerified: z.boolean(),
  onboardingStep: z.enum(["profile", "avatar", "organization", "done"]),
  canCreateOrganizations: z.boolean(),
  notificationChannel: z.enum(NOTIFICATION_CHANNELS),
  activeOrganizationId: z.string().nullable(),
  memberships: z.array(membershipSchema),
});

const errorSchema = z.object({ error: z.string() });

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  /** Absent leaves the picture alone; null removes it. */
  image: avatarSchema.optional(),
});

const channelSchema = z.object({ channel: z.enum(NOTIFICATION_CHANNELS) });

const channelRoute = createRoute({
  method: "patch",
  path: "/me/notifications",
  tags: ["auth"],
  summary: "Choose where notifications reach me",
  description:
    "The choice applies to what is written from now on. `all` is the app and email, `in-app` and `email` are one of them, `none` is silence.",
  request: { body: { content: { "application/json": { schema: channelSchema } } } },
  responses: {
    200: {
      description: "What is stored now",
      content: { "application/json": { schema: channelSchema } },
    },
    401: {
      description: "No active session",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const route = createRoute({
  method: "get",
  path: "/me",
  tags: ["auth"],
  summary: "Read the signed-in user and their organizations",
  responses: {
    200: {
      description: "The signed-in user",
      content: { "application/json": { schema: meSchema } },
    },
    401: {
      description: "No active session",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["auth"],
  summary: "Change my name or picture",
  request: { body: { content: { "application/json": { schema: profileSchema } } } },
  responses: {
    200: {
      description: "What is stored now",
      content: {
        "application/json": {
          schema: z.object({ name: z.string(), image: z.string().nullable() }),
        },
      },
    },
    401: {
      description: "No active session",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

export const meRoutes = new OpenAPIHono<AppEnv>()
  .openapi(channelRoute, async (c) => {
    const current = c.get("user");
    if (!current) return c.json({ error: "Unauthorized" }, 401);

    const { channel } = c.req.valid("json");

    await c.var.db
      .update(user)
      .set({ notificationChannel: channel, updatedAt: new Date() })
      .where(eq(user.id, current.id));

    // The cookie cache still carries the old choice. A forced session read
    // re-issues the cookie, so the next page shows the new one.
    const refreshed = await c.var.auth.api.getSession({
      headers: c.req.raw.headers,
      query: { disableCookieCache: true },
      returnHeaders: true,
    });
    forwardCookies(c, refreshed.headers);

    return c.json({ channel }, 200);
  })
  .openapi(updateRoute, async (c) => {
    const current = c.get("user");
    if (!current) return c.json({ error: "Unauthorized" }, 401);

    const { name, image } = c.req.valid("json");

    const [row] = await c.var.db
      .update(user)
      .set({ name, updatedAt: new Date(), ...(image === undefined ? {} : { image }) })
      .where(eq(user.id, current.id))
      .returning({ name: user.name, image: user.image });

    return c.json({ name: row?.name ?? name, image: row?.image ?? null }, 200);
  })
  .openapi(route, async (c) => {
    const user = c.get("user");
    const session = c.get("session");

    if (!user || !session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const rows = await c.var.db
      .select({
        organizationId: member.organizationId,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(member.userId, user.id))
      .orderBy(member.createdAt);

    const memberships = rows.flatMap((row) =>
      isRoleName(row.role) ? [{ ...row, logo: row.logo ?? null, role: row.role }] : [],
    );

    return c.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        emailVerified: user.emailVerified,
        onboardingStep: isOnboardingStep(user.onboardingStep) ? user.onboardingStep : "profile",
        canCreateOrganizations: user.canCreateOrganizations === true,
        notificationChannel: isNotificationChannel(user.notificationChannel)
          ? user.notificationChannel
          : "all",
        activeOrganizationId: session.activeOrganizationId ?? null,
        memberships,
      },
      200,
    );
  });
