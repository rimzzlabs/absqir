import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

/**
 * What a role may do inside an organization. Better Auth checks these on its
 * own endpoints (invite, change role, remove member, delete organization).
 * The absqir API checks the same roles through `requireRole`.
 */
const statements = {
  ...defaultStatements,
  person: ["create", "read", "update", "delete", "import"],
  group: ["create", "read", "update", "delete"],
  event: ["create", "read", "update", "delete", "scan"],
  schedule: ["create", "read", "update", "delete"],
  leave: ["read", "approve"],
  report: ["read", "export"],
} as const;

export const ac = createAccessControl(statements);

export const owner = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  person: ["create", "read", "update", "delete", "import"],
  group: ["create", "read", "update", "delete"],
  event: ["create", "read", "update", "delete", "scan"],
  schedule: ["create", "read", "update", "delete"],
  leave: ["read", "approve"],
  report: ["read", "export"],
});

export const admin = ac.newRole({
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["read"],
  person: ["create", "read", "update", "delete", "import"],
  group: ["create", "read", "update", "delete"],
  event: ["create", "read", "update", "delete", "scan"],
  schedule: ["create", "read", "update", "delete"],
  leave: ["read", "approve"],
  report: ["read", "export"],
});

export const organizer = ac.newRole({
  person: ["read"],
  group: ["read"],
  event: ["create", "read", "update", "scan"],
  schedule: ["read"],
  leave: ["read"],
  report: ["read"],
});

export const member = ac.newRole({
  event: ["read"],
});

export const roles = { owner, admin, organizer, member };

export type RoleName = keyof typeof roles;

export const ROLE_NAMES = ["owner", "admin", "organizer", "member"] as const satisfies RoleName[];

/** Lower is more powerful. `requireRole("organizer")` admits owner and admin too. */
const RANK: Record<RoleName, number> = { owner: 0, admin: 1, organizer: 2, member: 3 };

export function isRoleName(value: string): value is RoleName {
  return value in RANK;
}

export function roleAtLeast(role: string, minimum: RoleName): boolean {
  return isRoleName(role) && RANK[role] <= RANK[minimum];
}
