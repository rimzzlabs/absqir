/**
 * Who may change another person's access. The directory page and the server
 * both read these rules, so one answer covers the select, the menu item, and
 * the guard behind them.
 */

export type RoleName = "owner" | "admin" | "organizer" | "member";

export const ROLE_LABELS: Record<RoleName, string> = {
  owner: "Owner",
  admin: "Admin",
  organizer: "Organizer",
  member: "Member",
};

export interface AccessSubject {
  /** Null when the person has no account in this organization. */
  role: RoleName | null;
  /** True when the row belongs to the viewer's own account. */
  isSelf: boolean;
}

/**
 * Admins manage everyone below owner. Owners manage everyone but themselves.
 * A person with no account has no access to manage.
 */
export function canManageAccess(viewer: RoleName, subject: AccessSubject): boolean {
  if (subject.isSelf || subject.role === null) return false;
  if (viewer === "owner") return true;

  return viewer === "admin" && subject.role !== "owner";
}

/** Only an owner hands the owner role to somebody else. */
export function canGrantOwner(viewer: RoleName): boolean {
  return viewer === "owner";
}

/**
 * Deleting the directory row also ends the membership, so the owner is out of
 * reach until ownership moves. The viewer never deletes their own row.
 */
export function canDeleteFromDirectory(viewer: RoleName, subject: AccessSubject): boolean {
  if (subject.isSelf || subject.role === "owner") return false;

  return viewer === "owner" || viewer === "admin";
}
