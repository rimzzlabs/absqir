import type { NotificationChannel } from "@absqir/db/schema";
import { describe, expect, it } from "vitest";
import { reachesApp, reachesEmail, routeByChannel } from "../src/lib/notifications";

const CHOICES: Record<string, NotificationChannel> = {
  ada: "all",
  bob: "in-app",
  cid: "email",
  dee: "none",
};

const channelOf = (userId: string): NotificationChannel => CHOICES[userId] ?? "all";

describe("routeByChannel", () => {
  it("stamps every row with the account's choice and drops the silent ones", () => {
    const rows = ["ada", "bob", "cid", "dee", "eve"].map((userId) => ({ userId }));

    expect(routeByChannel(rows, channelOf)).toEqual([
      { userId: "ada", channel: "all" },
      { userId: "bob", channel: "in-app" },
      { userId: "cid", channel: "email" },
      { userId: "eve", channel: "all" },
    ]);
  });
});

describe("channels", () => {
  it("keeps email-only rows out of the app", () => {
    expect(reachesApp("all")).toBe(true);
    expect(reachesApp("in-app")).toBe(true);
    expect(reachesApp("email")).toBe(false);
  });

  it("keeps in-app-only rows out of the mail", () => {
    expect(reachesEmail("all")).toBe(true);
    expect(reachesEmail("email")).toBe(true);
    expect(reachesEmail("in-app")).toBe(false);
  });
});
