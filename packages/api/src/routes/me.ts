import { isRoleName } from "@absqir/auth";
import { isTimezone } from "@absqir/core/timezone";
import { schema } from "@absqir/db";
import { isNotificationChannel, isOnboardingStep, NOTIFICATION_CHANNELS } from "@absqir/db/schema";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import { forwardCookies } from "@/lib/auth-forward";
import { avatarSchema } from "@/lib/avatar";
import { decodeCursor, pageOf } from "@/lib/cursor";
import type { AppEnv } from "@/types";

const { member, organization, session, user } = schema;

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
  /** IANA zone, or null to follow the device. */
  timezone: z.string().nullable(),
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

/** Null means "follow the device". */
const timezoneSchema = z.object({ timezone: z.string().max(64).nullable() });

const DEVICE_PAGE_SIZE = 8;
const MAX_DEVICE_PAGE_SIZE = 50;

const deviceSchema = z.object({
  id: z.string(),
  /** What `revokeSession` wants. */
  token: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** The one that made this request. */
  current: z.boolean(),
});

const devicePage = z.object({
  items: z.array(deviceSchema),
  /** Pass it back as `cursor` for the next page. Null when this is the last page. */
  nextCursor: z.string().nullable(),
});

const devicesRoute = createRoute({
  method: "get",
  path: "/me/devices",
  tags: ["auth"],
  summary: "The browsers signed in as me, one page at a time",
  description:
    "This device first, then the most recently seen. The page walks the (user, last seen) index, not an offset.",
  request: {
    query: z.object({
      cursor: z.string().max(256).optional(),
      limit: z.coerce.number().int().min(1).max(MAX_DEVICE_PAGE_SIZE).optional(),
    }),
  },
  responses: {
    200: {
      description: "One page of devices",
      content: { "application/json": { schema: devicePage } },
    },
    401: {
      description: "No active session",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

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

const timezoneRoute = createRoute({
  method: "patch",
  path: "/me/timezone",
  tags: ["auth"],
  summary: "Choose the time zone I read times in",
  description:
    "An IANA name such as `Asia/Jakarta`. Every page then shows that clock, and reminders are worded in it. Null follows the device again.",
  request: { body: { content: { "application/json": { schema: timezoneSchema } } } },
  responses: {
    200: {
      description: "What is stored now",
      content: { "application/json": { schema: timezoneSchema } },
    },
    400: {
      description: "Not a zone this server knows",
      content: { "application/json": { schema: errorSchema } },
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
  .openapi(devicesRoute, async (c) => {
    const current = c.get("user");
    const mine = c.get("session");
    if (!current || !mine) return c.json({ error: "Unauthorized" }, 401);

    const query = c.req.valid("query");
    const limit = query.limit ?? DEVICE_PAGE_SIZE;
    const cursor = decodeCursor(query.cursor);
    const now = new Date();

    // Postgres keeps microseconds and JS keeps milliseconds, so the cursor
    // carries the column as text and the comparison happens in Postgres.
    const seenAt = sql<string>`${session.updatedAt}::text`;
    const after = cursor
      ? or(
          lt(session.updatedAt, sql`${cursor.at}::timestamp`),
          and(eq(session.updatedAt, sql`${cursor.at}::timestamp`), lt(session.id, cursor.id)),
        )
      : undefined;

    const rows = await c.var.db
      .select({ row: session, at: seenAt })
      .from(session)
      .where(
        and(
          eq(session.userId, current.id),
          gt(session.expiresAt, now),
          // This device leads the first page and never repeats on a later one.
          cursor ? sql`${session.id} <> ${mine.id}` : undefined,
          after,
        ),
      )
      .orderBy(
        ...(cursor ? [] : [desc(sql`${session.id} = ${mine.id}`)]),
        desc(session.updatedAt),
        desc(session.id),
      )
      .limit(limit + 1);

    const page = pageOf(rows, limit, (entry) => ({ at: entry.at, id: entry.row.id }));

    return c.json(
      {
        items: page.items.map(({ row }) => ({
          id: row.id,
          token: row.token,
          userAgent: row.userAgent ?? null,
          ipAddress: row.ipAddress ?? null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          current: row.id === mine.id,
        })),
        nextCursor: page.nextCursor,
      },
      200,
    );
  })
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
  .openapi(timezoneRoute, async (c) => {
    const current = c.get("user");
    if (!current) return c.json({ error: "Unauthorized" }, 401);

    const { timezone } = c.req.valid("json");
    if (timezone !== null && !isTimezone(timezone)) {
      return c.json({ error: "Unknown time zone." }, 400);
    }

    await c.var.db
      .update(user)
      .set({ timezone, updatedAt: new Date() })
      .where(eq(user.id, current.id));

    // The cookie cache still carries the old zone; see the channel route.
    const refreshed = await c.var.auth.api.getSession({
      headers: c.req.raw.headers,
      query: { disableCookieCache: true },
      returnHeaders: true,
    });
    forwardCookies(c, refreshed.headers);

    return c.json({ timezone }, 200);
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
        timezone: isTimezone(user.timezone) ? user.timezone : null,
        activeOrganizationId: session.activeOrganizationId ?? null,
        memberships,
      },
      200,
    );
  });
