import { describe, expect, it } from "vitest";
import {
  isAccountPath,
  isOrgFreePath,
  isPublicPath,
  isReservedSlug,
  isSlugTakenCode,
  orgPath,
  splitOrgPath,
} from "../src/org-path";

describe("isReservedSlug", () => {
  it("refuses a name a root page already holds", () => {
    expect(isReservedSlug("settings")).toBe(true);
    expect(isReservedSlug("api")).toBe(true);
    expect(isReservedSlug("sign-in")).toBe(true);
  });

  it("refuses a name absqir keeps for later", () => {
    expect(isReservedSlug("pricing")).toBe(true);
    expect(isReservedSlug("admin")).toBe(true);
  });

  it("reads a slug in any case, and around spaces", () => {
    expect(isReservedSlug(" Settings ")).toBe(true);
  });

  it("allows a name absqir does not hold", () => {
    expect(isReservedSlug("acme")).toBe(false);
    expect(isReservedSlug("acme-corp")).toBe(false);
  });
});

describe("orgPath", () => {
  it("puts the slug in front of a page", () => {
    expect(orgPath("acme", "/events")).toBe("/acme/events");
  });

  it("names the dashboard with the slug alone", () => {
    expect(orgPath("acme", "/")).toBe("/acme");
    expect(orgPath("acme", "")).toBe("/acme");
  });

  it("keeps a deep page whole", () => {
    expect(orgPath("acme", "/events/123/scan")).toBe("/acme/events/123/scan");
  });

  it("accepts a path without a leading slash", () => {
    expect(orgPath("acme", "events")).toBe("/acme/events");
  });
});

describe("splitOrgPath", () => {
  it("reads the slug and the page under it", () => {
    expect(splitOrgPath("/acme/events")).toEqual({ slug: "acme", rest: "/events" });
  });

  it("reads the dashboard as the root page", () => {
    expect(splitOrgPath("/acme")).toEqual({ slug: "acme", rest: "/" });
  });

  it("drops a trailing slash", () => {
    expect(splitOrgPath("/acme/")).toEqual({ slug: "acme", rest: "/" });
  });

  it("keeps a deep page whole", () => {
    expect(splitOrgPath("/acme/events/123/scan")).toEqual({
      slug: "acme",
      rest: "/events/123/scan",
    });
  });

  it("reads nothing from the root", () => {
    expect(splitOrgPath("/")).toBeNull();
    expect(splitOrgPath("")).toBeNull();
  });
});

describe("orgPath and splitOrgPath together", () => {
  it("round trips every page the sidebar names", () => {
    const pages = ["/", "/events", "/organization/members", "/my/history"];

    for (const page of pages) {
      expect(splitOrgPath(orgPath("acme", page))).toEqual({ slug: "acme", rest: page });
    }
  });
});

describe("isPublicPath", () => {
  it("opens the door, an invitation, and a public event", () => {
    expect(isPublicPath("/sign-in")).toBe(true);
    expect(isPublicPath("/sign-up")).toBe(true);
    expect(isPublicPath("/invite/abc")).toBe(true);
    expect(isPublicPath("/e/abc")).toBe(true);
  });

  it("closes everything else", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/settings")).toBe(false);
    expect(isPublicPath("/acme/events")).toBe(false);
  });
});

describe("isAccountPath", () => {
  it("keeps the account pages at the root", () => {
    expect(isAccountPath("/")).toBe(true);
    expect(isAccountPath("/settings")).toBe(true);
    expect(isAccountPath("/account")).toBe(true);
    expect(isAccountPath("/onboarding")).toBe(true);
  });

  it("keeps the public pages and the check-in link at the root", () => {
    expect(isAccountPath("/sign-in")).toBe(true);
    expect(isAccountPath("/e/abc")).toBe(true);
    expect(isAccountPath("/a/abc")).toBe(true);
  });

  it("sends every organization page under a slug", () => {
    const pages = [
      "/acme",
      "/acme/events",
      "/acme/organization/members",
      "/acme/my/history",
      "/acme/check-in",
      "/acme/settings",
    ];

    for (const page of pages) {
      expect(isAccountPath(page)).toBe(false);
    }
  });

  it("refuses the old address of a page that moved", () => {
    expect(isAccountPath("/events")).toBe(false);
    expect(isAccountPath("/organization")).toBe(false);
    expect(isAccountPath("/my/events")).toBe(false);
  });
});

describe("isOrgFreePath", () => {
  it("opens what works without an organization", () => {
    expect(isOrgFreePath("/")).toBe(true);
    expect(isOrgFreePath("/settings")).toBe(true);
    expect(isOrgFreePath("/onboarding")).toBe(true);
    expect(isOrgFreePath("/invite/abc")).toBe(true);
  });

  it("closes the check-in link, which needs an organization", () => {
    expect(isOrgFreePath("/a/abc")).toBe(false);
  });

  it("closes every organization page", () => {
    expect(isOrgFreePath("/acme")).toBe(false);
    expect(isOrgFreePath("/acme/events")).toBe(false);
  });
});

describe("isSlugTakenCode", () => {
  it("knows both names Better Auth gives the same failure", () => {
    expect(isSlugTakenCode("ORGANIZATION_ALREADY_EXISTS")).toBe(true);
    expect(isSlugTakenCode("ORGANIZATION_SLUG_ALREADY_TAKEN")).toBe(true);
  });

  it("leaves every other failure alone", () => {
    expect(isSlugTakenCode("ORGANIZATION_NOT_FOUND")).toBe(false);
    expect(isSlugTakenCode(null)).toBe(false);
    expect(isSlugTakenCode(undefined)).toBe(false);
  });
});

describe("a reserved slug never reaches a root page", () => {
  it("holds every root address the app serves", () => {
    const roots = ["settings", "account", "onboarding", "api", "invite", "sign-in", "sign-up"];

    for (const root of roots) {
      expect(isReservedSlug(root)).toBe(true);
    }
  });
});
