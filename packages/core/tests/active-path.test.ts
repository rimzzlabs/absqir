import { describe, expect, it } from "vitest";
import { activeHref, activeNavHref, isActivePath } from "../src/active-path";

const SIDEBAR = [
  "/",
  "/events",
  "/organization",
  "/organization/members",
  "/organization/groups",
  "/settings",
];

describe("isActivePath", () => {
  it("matches the page itself", () => {
    expect(isActivePath("/events", "/events")).toBe(true);
  });

  it("matches a page under it", () => {
    expect(isActivePath("/events", "/events/abc")).toBe(true);
  });

  it("refuses an address that only shares a prefix", () => {
    expect(isActivePath("/event", "/events")).toBe(false);
    expect(isActivePath("/organization", "/organizations")).toBe(false);
  });

  it("keeps the root to itself", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/", "/events")).toBe(false);
  });
});

describe("activeHref", () => {
  it("picks the entry the reader is on", () => {
    expect(activeHref(SIDEBAR, "/events")).toBe("/events");
    expect(activeHref(SIDEBAR, "/settings")).toBe("/settings");
  });

  it("picks the longest cover when one address nests inside another", () => {
    expect(activeHref(SIDEBAR, "/organization/members")).toBe("/organization/members");
    expect(activeHref(SIDEBAR, "/organization/groups")).toBe("/organization/groups");
  });

  it("falls back to the parent when the page has no entry of its own", () => {
    expect(activeHref(SIDEBAR, "/events/abc")).toBe("/events");
    expect(activeHref(SIDEBAR, "/organization?tab=places".split("?")[0] ?? "")).toBe(
      "/organization",
    );
  });

  it("answers null when nothing covers the page", () => {
    expect(activeHref(SIDEBAR, "/sign-in")).toBe(null);
  });

  it("answers null for an empty sidebar", () => {
    expect(activeHref([], "/events")).toBe(null);
  });
});

describe("activeNavHref", () => {
  const ORG_SIDEBAR = [
    "/acme",
    "/acme/events",
    "/acme/organization",
    "/acme/organization/members",
    "/settings",
  ];

  it("lights the dashboard on the dashboard", () => {
    expect(activeNavHref({ hrefs: ORG_SIDEBAR, currentPath: "/acme", home: "/acme" })).toBe(
      "/acme",
    );
  });

  it("lights the entry that owns a page under it", () => {
    expect(
      activeNavHref({ hrefs: ORG_SIDEBAR, currentPath: "/acme/events/123", home: "/acme" }),
    ).toBe("/acme/events");
  });

  it("picks the longest entry that covers the page", () => {
    expect(
      activeNavHref({
        hrefs: ORG_SIDEBAR,
        currentPath: "/acme/organization/members",
        home: "/acme",
      }),
    ).toBe("/acme/organization/members");
  });

  it("lights nothing on a page with no entry of its own", () => {
    expect(
      activeNavHref({ hrefs: ORG_SIDEBAR, currentPath: "/acme/notifications", home: "/acme" }),
    ).toBeNull();
  });

  it("lights an account entry from inside an organization", () => {
    expect(activeNavHref({ hrefs: ORG_SIDEBAR, currentPath: "/settings", home: "/acme" })).toBe(
      "/settings",
    );
  });
});
