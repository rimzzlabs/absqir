/// <reference path="./.astro/types.d.ts" />
/// <reference path="./worker-configuration.d.ts" />

type AbsqirSession = import("@absqir/auth").Session;

declare namespace App {
  interface Locals {
    /** Set by src/middleware.ts on every page request. */
    user: AbsqirSession["user"] | null;
    session: AbsqirSession["session"] | null;
  }
}
