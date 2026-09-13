import { schema } from "@absqir/db";
import { findOrganizationForEmail, findPendingJoinRequest } from "@absqir/db/domains";
import { ensurePersonForUser } from "@absqir/db/people";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A } from "@mobily/ts-belt";
import { and, desc, eq, ne } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { match } from "ts-pattern";
import { deliver } from "#src/lib/notifications";
import { notifyJoinDecided, notifyJoinRequested } from "#src/lib/notify";
import { activateOrganization, setOnboardingStep } from "#src/lib/onboarding";
import { organizationGuard, organizationIdOf, requireRole } from "#src/lib/org-access";
import type { AppEnv } from "#src/types";

const { joinRequest, member, organization, user } = schema;

/** A queue an admin can read in one screen. Requests are few and short lived. */
const MAX_REQUESTS = 100;

const MAX_MESSAGE_LENGTH = 500;

const errorSchema = z.object({ error: z.string() });

const unauthorized = {
  description: "No active event",
  content: { "application/json": { schema: errorSchema } },
} as const;

const askResult = z.object({
  /** `joined` when the workspace takes people at once, `pending` when an admin decides. */
  status: z.enum(["joined", "pending"]),
  organizationId: z.string(),
  organizationName: z.string(),
  requestId: z.string().nullable(),
});

const askRoute = createRoute({
  method: "post",
  path: "/join-requests",
  tags: ["join-requests"],
  summary: "Ask the workspace that claimed my email domain to let me in",
  description:
    "The domain must be claimed and verified, and the workspace must take people from it. An `auto` workspace makes the caller a member at once. A `request` workspace opens one request and tells its admins.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string().trim().max(MAX_MESSAGE_LENGTH).optional() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Joined, or waiting",
      content: { "application/json": { schema: askResult } },
    },
    401: unauthorized,
    403: {
      description: "No workspace claims this domain, or it takes nobody",
      content: { "application/json": { schema: errorSchema } },
    },
    409: {
      description: "Already a member, or already waiting",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const withdrawRoute = createRoute({
  method: "delete",
  path: "/join-requests/mine",
  tags: ["join-requests"],
  summary: "Take back my open request",
  responses: {
    200: {
      description: "Withdrawn",
      content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
    },
    401: unauthorized,
    404: {
      description: "Nothing to withdraw",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const requestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  domain: z.string(),
  message: z.string().nullable(),
  status: z.enum(["pending", "approved", "declined"]),
  decisionNote: z.string().nullable(),
  decidedAt: z.string().nullable(),
  createdAt: z.string(),
});

const listRoute = createRoute({
  method: "get",
  path: "/organizations/join-requests",
  tags: ["join-requests"],
  summary: "Who asks to join this organization",
  request: {
    query: z.object({ status: z.enum(["pending", "decided", "all"]).optional() }),
  },
  responses: {
    200: {
      description: "The queue, newest first",
      content: { "application/json": { schema: z.object({ items: z.array(requestSchema) }) } },
    },
    401: unauthorized,
    403: {
      description: "The role is too low",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const decideRoute = createRoute({
  method: "post",
  path: "/organizations/join-requests/{id}/decide",
  tags: ["join-requests"],
  summary: "Let somebody in, or turn them down",
  description:
    "An approval writes the member row and the directory row, the same way an accepted invitation does. Either way the account is told.",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            decision: z.enum(["approved", "declined"]),
            note: z.string().trim().max(MAX_MESSAGE_LENGTH).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Decided",
      content: { "application/json": { schema: z.object({ id: z.string(), status: z.string() }) } },
    },
    401: unauthorized,
    403: {
      description: "The role is too low",
      content: { "application/json": { schema: errorSchema } },
    },
    404: {
      description: "No such open request",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

function requireUser(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!c.get("user")) return c.json({ error: "Unauthorized" }, 401);
    await next();
  };
}

function userOf(c: Context<AppEnv>) {
  const current = c.get("user");
  if (!current) throw new Error("requireUser did not run for this route");

  return current;
}

/** Makes an account a member, and gives it its directory row. Safe to repeat. */
async function joinAsMember(
  c: Context<AppEnv>,
  organizationId: string,
  account: { id: string; name: string; email: string },
) {
  const existing = await c.var.db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, account.id)))
    .limit(1);

  if (!existing[0]) {
    await c.var.db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId,
      userId: account.id,
      role: "member",
    });
  }

  await ensurePersonForUser(c.var.db, {
    organizationId,
    userId: account.id,
    name: account.name,
    email: account.email,
  });
}

const app = new OpenAPIHono<AppEnv>();

// The caller has no membership yet, so these two carry no organization guard.
app.use("/join-requests", requireUser());
app.use("/join-requests/*", requireUser());
app.use("/organizations/join-requests", organizationGuard(), requireRole("admin"));
app.use("/organizations/join-requests/*", organizationGuard(), requireRole("admin"));

export const joinRequestRoutes = app
  .openapi(askRoute, async (c) => {
    const current = userOf(c);
    const { message } = c.req.valid("json");
    const db = c.var.db;

    const found = await findOrganizationForEmail(db, current.email);

    if (!found || found.joinPolicy === "closed") {
      return c.json({ error: "No workspace takes people from this email domain." }, 403);
    }

    const already = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.organizationId, found.organizationId), eq(member.userId, current.id)))
      .limit(1);

    if (already[0]) {
      return c.json({ error: `You are already in ${found.name}.` }, 409);
    }

    if (found.joinPolicy === "auto") {
      await joinAsMember(c, found.organizationId, current);
      await activateOrganization(c, found.organizationId);
      await setOnboardingStep(c, current.id, "done");

      return c.json(
        {
          status: "joined" as const,
          organizationId: found.organizationId,
          organizationName: found.name,
          requestId: null,
        },
        200,
      );
    }

    const open = await findPendingJoinRequest(db, {
      organizationId: found.organizationId,
      userId: current.id,
    });

    if (open) {
      return c.json({ error: `${found.name} already has your request.` }, 409);
    }

    const id = crypto.randomUUID();

    await db.insert(joinRequest).values({
      id,
      organizationId: found.organizationId,
      userId: current.id,
      domain: found.domain,
      message: match(Boolean(message && message.length > 0))
        .with(true, () => message)
        .otherwise(() => null),
    });

    // The account is set up. It waits on the home page, with the frame around
    // it, not in the middle of onboarding.
    await setOnboardingStep(c, current.id, "done");

    deliver(
      c,
      await notifyJoinRequested(db, {
        organizationId: found.organizationId,
        requestId: id,
        personName: current.name,
        email: current.email,
        message: message ?? null,
      }),
    );

    return c.json(
      {
        status: "pending" as const,
        organizationId: found.organizationId,
        organizationName: found.name,
        requestId: id,
      },
      200,
    );
  })
  .openapi(withdrawRoute, async (c) => {
    const current = userOf(c);

    const rows = await c.var.db
      .select({ id: joinRequest.id })
      .from(joinRequest)
      .where(and(eq(joinRequest.userId, current.id), eq(joinRequest.status, "pending")))
      .limit(1);

    const found = rows[0];
    if (!found) return c.json({ error: "You have no open request." }, 404);

    await c.var.db.delete(joinRequest).where(eq(joinRequest.id, found.id));

    return c.json({ ok: true }, 200);
  })
  .openapi(listRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const status = c.req.valid("query").status ?? "pending";

    const rows = await c.var.db
      .select({
        id: joinRequest.id,
        userId: joinRequest.userId,
        name: user.name,
        email: user.email,
        image: user.image,
        domain: joinRequest.domain,
        message: joinRequest.message,
        status: joinRequest.status,
        decisionNote: joinRequest.decisionNote,
        decidedAt: joinRequest.decidedAt,
        createdAt: joinRequest.createdAt,
      })
      .from(joinRequest)
      .innerJoin(user, eq(user.id, joinRequest.userId))
      .where(
        match(status)
          .with("all", () => eq(joinRequest.organizationId, organizationId))
          .otherwise((status) =>
            and(
              eq(joinRequest.organizationId, organizationId),
              status === "pending"
                ? eq(joinRequest.status, "pending")
                : ne(joinRequest.status, "pending"),
            ),
          ),
      )
      .orderBy(desc(joinRequest.createdAt))
      .limit(MAX_REQUESTS);

    return c.json(
      {
        items: [
          ...A.map(rows, (row) => ({
            ...row,
            image: row.image ?? null,
            message: row.message ?? null,
            decisionNote: row.decisionNote ?? null,
            decidedAt: row.decidedAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
          })),
        ],
      },
      200,
    );
  })
  .openapi(decideRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const current = userOf(c);
    const { id } = c.req.valid("param");
    const { decision, note } = c.req.valid("json");
    const db = c.var.db;

    const rows = await db
      .select({
        id: joinRequest.id,
        userId: joinRequest.userId,
        name: user.name,
        email: user.email,
      })
      .from(joinRequest)
      .innerJoin(user, eq(user.id, joinRequest.userId))
      .where(
        and(
          eq(joinRequest.id, id),
          eq(joinRequest.organizationId, organizationId),
          eq(joinRequest.status, "pending"),
        ),
      )
      .limit(1);

    const found = rows[0];
    if (!found) return c.json({ error: "No such open request." }, 404);

    if (decision === "approved") {
      await joinAsMember(c, organizationId, found);
    }

    await db
      .update(joinRequest)
      .set({
        status: decision,
        decidedBy: current.id,
        decidedAt: new Date(),
        decisionNote: match(Boolean(note && note.length > 0))
          .with(true, () => note)
          .otherwise(() => null),
        updatedAt: new Date(),
      })
      .where(eq(joinRequest.id, found.id));

    const organizations = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    deliver(
      c,
      await notifyJoinDecided(db, {
        organizationId,
        organizationName: organizations[0]?.name ?? "The organization",
        requestId: found.id,
        userId: found.userId,
        decision,
        note: note ?? null,
      }),
    );

    return c.json({ id: found.id, status: decision }, 200);
  });
