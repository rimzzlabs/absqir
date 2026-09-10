/// <reference path="./.astro/types.d.ts" />
/// <reference path="./worker-configuration.d.ts" />

type AbsqirSession = import("@absqir/auth").Session;
type AbsqirRole = import("@absqir/auth").RoleName;
type AbsqirOnboardingStep = import("@absqir/db/schema").OnboardingStep;

interface AbsqirMembership {
  organizationId: string;
  name: string;
  slug: string;
  logo: string | null;
  role: AbsqirRole;
}

declare namespace App {
  interface Locals {
    /** Set by src/middleware.ts on every page request. */
    user: AbsqirSession["user"] | null;
    session: AbsqirSession["session"] | null;
    /** The step the signed-in user still has to complete. */
    onboardingStep: AbsqirOnboardingStep | null;
    /** Every organization the signed-in user belongs to, oldest first. */
    memberships: readonly AbsqirMembership[];
    /** The membership behind the session's active organization. */
    activeMembership: AbsqirMembership | null;
  }
}
