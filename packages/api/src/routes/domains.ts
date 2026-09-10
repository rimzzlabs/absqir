import {
  domainVerificationHost,
  domainVerificationRecord,
  isClaimableDomain,
  normalizeDomain,
} from "@absqir/core/email-domain";
import { schema } from "@absqir/db";
import { JOIN_POLICIES } from "@absqir/db/schema";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { A } from "@mobily/ts-belt";
import { and, asc, eq } from "drizzle-orm";
import { txtRecords } from "#src/lib/dns";
import { organizationGuard, organizationIdOf, requireRole } from "#src/lib/org-access";
import type { AppEnv } from "#src/types";

const { organization, organizationDomain } = schema;

/** More than this and a workspace is collecting domains, not using them. */
const MAX_DOMAINS = 20;

const errorSchema = z.object({ error: z.string() });

const unauthorized = {
  description: "No active session",
  content: { "application/json": { schema: errorSchema } },
} as const;
const forbidden = {
  description: "The role is too low",
  content: { "application/json": { schema: errorSchema } },
} as const;

const domainSchema = z.object({
  id: z.string(),
  domain: z.string(),
  verified: z.boolean(),
  /** `email` when the owner's own address proved it, `dns` for a TXT record. */
  verifiedBy: z.enum(["email", "dns"]).nullable(),
  verifiedAt: z.string().nullable(),
  /** The host the TXT record goes on. */
  recordHost: z.string(),
  /** What that record must say, word for word. */
  recordValue: z.string(),
  createdAt: z.string(),
});

const listResult = z.object({
  items: z.array(domainSchema),
  joinPolicy: z.enum(JOIN_POLICIES),
});

const listRoute = createRoute({
  method: "get",
  path: "/organizations/domains",
  tags: ["domains"],
  summary: "The email domains this organization claims",
  description:
    "A verified domain lets a new account at that domain find this workspace. What it may then do is the join policy.",
  responses: {
    200: { description: "The domains", content: { "application/json": { schema: listResult } } },
    401: unauthorized,
    403: forbidden,
  },
});

const claimRoute = createRoute({
  method: "post",
  path: "/organizations/domains",
  tags: ["domains"],
  summary: "Claim an email domain",
  description:
    "The claim starts unverified. Put the TXT record on the host the reply names, then ask for a check. A mailbox provider such as gmail.com can never be claimed.",
  request: {
    body: {
      content: {
        "application/json": { schema: z.object({ domain: z.string().trim().min(3).max(253) }) },
      },
    },
  },
  responses: {
    201: { description: "Claimed", content: { "application/json": { schema: domainSchema } } },
    400: {
      description: "Not a domain, or a mailbox provider",
      content: { "application/json": { schema: errorSchema } },
    },
    401: unauthorized,
    403: forbidden,
    409: {
      description: "Claimed already, here or elsewhere",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const verifyRoute = createRoute({
  method: "post",
  path: "/organizations/domains/{id}/verify",
  tags: ["domains"],
  summary: "Check the TXT record and verify the claim",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "The domain, verified or still not",
      content: { "application/json": { schema: domainSchema } },
    },
    401: unauthorized,
    403: forbidden,
    404: {
      description: "No such domain",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const releaseRoute = createRoute({
  method: "delete",
  path: "/organizations/domains/{id}",
  tags: ["domains"],
  summary: "Give up a claim",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Released",
      content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
    },
    401: unauthorized,
    403: forbidden,
    404: {
      description: "No such domain",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const policyRoute = createRoute({
  method: "post",
  path: "/organizations/join-policy",
  tags: ["domains"],
  summary: "Say what a verified domain opens",
  description:
    "`closed` keeps the invitation as the only way in. `request` asks an admin to decide. `auto` makes a matching account a member at once.",
  request: {
    body: {
      content: { "application/json": { schema: z.object({ joinPolicy: z.enum(JOIN_POLICIES) }) } },
    },
  },
  responses: {
    200: {
      description: "Saved",
      content: { "application/json": { schema: z.object({ joinPolicy: z.enum(JOIN_POLICIES) }) } },
    },
    401: unauthorized,
    403: forbidden,
  },
});

type DomainRow = typeof organizationDomain.$inferSelect;

function toJson(row: DomainRow) {
  return {
    id: row.id,
    domain: row.domain,
    verified: row.verifiedAt !== null,
    verifiedBy: row.verifiedBy ?? null,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    recordHost: domainVerificationHost(row.domain),
    recordValue: domainVerificationRecord(row.verificationToken),
    createdAt: row.createdAt.toISOString(),
  };
}

const app = new OpenAPIHono<AppEnv>();

app.use("/organizations/domains", organizationGuard(), requireRole("admin"));
app.use("/organizations/domains/*", organizationGuard(), requireRole("admin"));
app.use("/organizations/join-policy", organizationGuard(), requireRole("admin"));

export const domainRoutes = app
  .openapi(listRoute, async (c) => {
    const organizationId = organizationIdOf(c);

    const [rows, orgs] = await Promise.all([
      c.var.db
        .select()
        .from(organizationDomain)
        .where(eq(organizationDomain.organizationId, organizationId))
        .orderBy(asc(organizationDomain.createdAt)),
      c.var.db
        .select({ joinPolicy: organization.joinPolicy })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1),
    ]);

    return c.json(
      { items: [...A.map(rows, toJson)], joinPolicy: orgs[0]?.joinPolicy ?? "request" },
      200,
    );
  })
  .openapi(claimRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const domain = normalizeDomain(c.req.valid("json").domain);

    if (domain === null) {
      return c.json({ error: "That is not a domain name." }, 400);
    }

    if (!isClaimableDomain(domain)) {
      return c.json(
        { error: `${domain} belongs to a mailbox provider, so no workspace can claim it.` },
        400,
      );
    }

    const taken = await c.var.db
      .select({ organizationId: organizationDomain.organizationId })
      .from(organizationDomain)
      .where(eq(organizationDomain.domain, domain))
      .limit(1);

    if (taken[0]) {
      const here = taken[0].organizationId === organizationId;
      return c.json(
        { error: here ? `${domain} is on your list already.` : `${domain} is claimed already.` },
        409,
      );
    }

    const count = await c.var.db
      .select({ id: organizationDomain.id })
      .from(organizationDomain)
      .where(eq(organizationDomain.organizationId, organizationId))
      .limit(MAX_DOMAINS);

    if (count.length >= MAX_DOMAINS) {
      return c.json({ error: `An organization can claim ${MAX_DOMAINS} domains at most.` }, 400);
    }

    const [row] = await c.var.db
      .insert(organizationDomain)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        domain,
        verificationToken: crypto.randomUUID().replaceAll("-", ""),
      })
      .returning();

    if (!row) throw new Error("the domain insert returned nothing");

    return c.json(toJson(row), 201);
  })
  .openapi(verifyRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const rows = await c.var.db
      .select()
      .from(organizationDomain)
      .where(
        and(eq(organizationDomain.id, id), eq(organizationDomain.organizationId, organizationId)),
      )
      .limit(1);

    const found = rows[0];
    if (!found) return c.json({ error: "No such domain." }, 404);
    if (found.verifiedAt) return c.json(toJson(found), 200);

    const wanted = domainVerificationRecord(found.verificationToken);
    const records = await txtRecords(domainVerificationHost(found.domain));

    if (!records.includes(wanted)) return c.json(toJson(found), 200);

    const now = new Date();

    const [updated] = await c.var.db
      .update(organizationDomain)
      .set({ verifiedAt: now, verifiedBy: "dns", updatedAt: now })
      .where(eq(organizationDomain.id, found.id))
      .returning();

    return c.json(toJson(updated ?? found), 200);
  })
  .openapi(releaseRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { id } = c.req.valid("param");

    const deleted = await c.var.db
      .delete(organizationDomain)
      .where(
        and(eq(organizationDomain.id, id), eq(organizationDomain.organizationId, organizationId)),
      )
      .returning({ id: organizationDomain.id });

    if (!deleted[0]) return c.json({ error: "No such domain." }, 404);

    return c.json({ ok: true }, 200);
  })
  .openapi(policyRoute, async (c) => {
    const organizationId = organizationIdOf(c);
    const { joinPolicy } = c.req.valid("json");

    await c.var.db
      .update(organization)
      .set({ joinPolicy })
      .where(eq(organization.id, organizationId));

    return c.json({ joinPolicy }, 200);
  });
