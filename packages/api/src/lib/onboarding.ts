import { schema } from "@absqir/db";
import type { OnboardingStep } from "@absqir/db/schema";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { forwardCookies } from "#src/lib/auth-forward";
import type { AppEnv } from "#src/types";

const { user } = schema;

/**
 * Moves an account to a step and re-issues the event cookie. The cookie
 * cache still carries the old user row, so a forced event read is what
 * makes the next page see the new step at once.
 */
export async function setOnboardingStep(
  c: Context<AppEnv>,
  userId: string,
  step: OnboardingStep,
): Promise<void> {
  await c.var.db
    .update(user)
    .set({ onboardingStep: step, updatedAt: new Date() })
    .where(eq(user.id, userId));

  const refreshed = await c.var.auth.api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
    returnHeaders: true,
  });

  forwardCookies(c, refreshed.headers);
}

/** Points the event at one organization, so the next page opens in it. */
export async function activateOrganization(
  c: Context<AppEnv>,
  organizationId: string,
): Promise<void> {
  const result = await c.var.auth.api.setActiveOrganization({
    body: { organizationId },
    headers: c.req.raw.headers,
    returnHeaders: true,
  });

  forwardCookies(c, result.headers);
}
