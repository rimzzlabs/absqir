import { describe, expect, it } from "vitest";
import {
  canDeleteFromDirectory,
  canGrantOwner,
  canManageAccess,
  type RoleName,
} from "../src/member-access";

const other = (role: RoleName | null) => ({ role, isSelf: false });
const self = (role: RoleName | null) => ({ role, isSelf: true });

describe("canManageAccess", () => {
  it("lets an owner manage every other account", () => {
    expect(canManageAccess("owner", other("owner"))).toBe(true);
    expect(canManageAccess("owner", other("admin"))).toBe(true);
    expect(canManageAccess("owner", other("member"))).toBe(true);
  });

  it("stops an admin at the owner", () => {
    expect(canManageAccess("admin", other("owner"))).toBe(false);
    expect(canManageAccess("admin", other("admin"))).toBe(true);
    expect(canManageAccess("admin", other("member"))).toBe(true);
  });

  it("refuses an organizer and a member", () => {
    expect(canManageAccess("organizer", other("member"))).toBe(false);
    expect(canManageAccess("member", other("member"))).toBe(false);
  });

  it("never lets the viewer manage their own row", () => {
    expect(canManageAccess("owner", self("owner"))).toBe(false);
    expect(canManageAccess("admin", self("admin"))).toBe(false);
  });

  it("finds no access to manage on a person with no account", () => {
    expect(canManageAccess("owner", other(null))).toBe(false);
  });
});

describe("canGrantOwner", () => {
  it("admits an owner alone", () => {
    expect(canGrantOwner("owner")).toBe(true);
    expect(canGrantOwner("admin")).toBe(false);
    expect(canGrantOwner("organizer")).toBe(false);
    expect(canGrantOwner("member")).toBe(false);
  });
});

describe("canDeleteFromDirectory", () => {
  it("lets an owner and an admin delete a person with no account", () => {
    expect(canDeleteFromDirectory("owner", other(null))).toBe(true);
    expect(canDeleteFromDirectory("admin", other(null))).toBe(true);
  });

  it("keeps the owner row out of reach, even from another owner", () => {
    expect(canDeleteFromDirectory("owner", other("owner"))).toBe(false);
    expect(canDeleteFromDirectory("admin", other("owner"))).toBe(false);
  });

  it("refuses an organizer", () => {
    expect(canDeleteFromDirectory("organizer", other("member"))).toBe(false);
  });

  it("never deletes the viewer's own row", () => {
    expect(canDeleteFromDirectory("owner", self("admin"))).toBe(false);
  });
});
