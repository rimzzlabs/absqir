import { isRoleName } from "@absqir/auth";
import { schema } from "@absqir/db";
import { isOnboardingStep } from "@absqir/db/schema";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
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
  activeOrganizationId: z.string().nullable(),
  memberships: z.array(membershipSchema),
});

const errorSchema = z.object({ error: z.string() });

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  /** Absent leaves the picture alone; null removes it. */
  image: avatarSchema.optional(),
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
        activeOrganizationId: session.activeOrganizationId ?? null,
        memberships,
      },
      200,
    );
  });
