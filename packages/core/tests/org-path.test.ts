import { describe, expect, it } from "vitest";
import { isReservedSlug, orgPath, RESERVED_SLUGS, splitOrgPath } from "../src/org-path";

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

  it("lists every reserved slug in order", () => {
    expect(RESERVED_SLUGS).toContain("settings");
    expect([...RESERVED_SLUGS].sort()).toEqual([...RESERVED_SLUGS]);
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
