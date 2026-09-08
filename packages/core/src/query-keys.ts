/**
 * Every TanStack Query key in the app is built here. Keys drift when they are
 * written inline, and a cache read then stops matching the cache write.
 */
export const sessionKeys = {
  all: ["session"] as const,
  current: () => [...sessionKeys.all, "current"] as const,
};

export const healthKeys = {
  all: ["health"] as const,
  status: () => [...healthKeys.all, "status"] as const,
};

export const meKeys = {
  all: ["me"] as const,
  current: () => [...meKeys.all, "current"] as const,
};

export const onboardingKeys = {
  all: ["onboarding"] as const,
  status: () => [...onboardingKeys.all, "status"] as const,
};

export const organizationKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
  current: () => [...organizationKeys.all, "current"] as const,
  members: () => [...organizationKeys.all, "members"] as const,
  invitations: () => [...organizationKeys.all, "invitations"] as const,
  invitation: (id: string) => [...organizationKeys.all, "invitation", id] as const,
};

export const organizationMutationKeys = {
  all: ["organization-mutations"] as const,
  create: () => [...organizationMutationKeys.all, "create"] as const,
  update: () => [...organizationMutationKeys.all, "update"] as const,
  setActive: () => [...organizationMutationKeys.all, "set-active"] as const,
  invite: () => [...organizationMutationKeys.all, "invite"] as const,
  cancelInvitation: () => [...organizationMutationKeys.all, "cancel-invitation"] as const,
  acceptInvitation: () => [...organizationMutationKeys.all, "accept-invitation"] as const,
  updateMemberRole: () => [...organizationMutationKeys.all, "update-member-role"] as const,
  removeMember: () => [...organizationMutationKeys.all, "remove-member"] as const,
};

export const peopleKeys = {
  all: ["people"] as const,
  list: (query = "") => [...peopleKeys.all, "list", query] as const,
};

export const peopleMutationKeys = {
  all: ["people-mutations"] as const,
  create: () => [...peopleMutationKeys.all, "create"] as const,
  update: () => [...peopleMutationKeys.all, "update"] as const,
  remove: () => [...peopleMutationKeys.all, "remove"] as const,
  invite: () => [...peopleMutationKeys.all, "invite"] as const,
  import: () => [...peopleMutationKeys.all, "import"] as const,
};

export const groupKeys = {
  all: ["groups"] as const,
  list: () => [...groupKeys.all, "list"] as const,
  detail: (id: string) => [...groupKeys.all, "detail", id] as const,
};

export const groupMutationKeys = {
  all: ["group-mutations"] as const,
  create: () => [...groupMutationKeys.all, "create"] as const,
  update: () => [...groupMutationKeys.all, "update"] as const,
  remove: () => [...groupMutationKeys.all, "remove"] as const,
  setMembers: () => [...groupMutationKeys.all, "set-members"] as const,
};

export const sessionListKeys = {
  all: ["sessions"] as const,
  list: (scope = "upcoming") => [...sessionListKeys.all, "list", scope] as const,
  detail: (id: string) => [...sessionListKeys.all, "detail", id] as const,
  records: (id: string) => [...sessionListKeys.all, "records", id] as const,
  qrToken: (id: string) => [...sessionListKeys.all, "qr-token", id] as const,
};

export const sessionMutationKeys = {
  all: ["session-mutations"] as const,
  create: () => [...sessionMutationKeys.all, "create"] as const,
  update: () => [...sessionMutationKeys.all, "update"] as const,
  remove: () => [...sessionMutationKeys.all, "remove"] as const,
  open: () => [...sessionMutationKeys.all, "open"] as const,
  close: () => [...sessionMutationKeys.all, "close"] as const,
  setRecord: () => [...sessionMutationKeys.all, "set-record"] as const,
  checkIn: () => [...sessionMutationKeys.all, "check-in"] as const,
  scan: () => [...sessionMutationKeys.all, "scan"] as const,
};

export const scheduleKeys = {
  all: ["schedules"] as const,
  list: () => [...scheduleKeys.all, "list"] as const,
};

export const scheduleMutationKeys = {
  all: ["schedule-mutations"] as const,
  create: () => [...scheduleMutationKeys.all, "create"] as const,
  update: () => [...scheduleMutationKeys.all, "update"] as const,
  remove: () => [...scheduleMutationKeys.all, "remove"] as const,
};

export const myKeys = {
  all: ["my"] as const,
  sessions: () => [...myKeys.all, "sessions"] as const,
  pass: (id: string) => [...myKeys.all, "pass", id] as const,
  history: () => [...myKeys.all, "history"] as const,
};

/** Mutation keys, so a pending sign-in can be observed from anywhere. */
export const authMutationKeys = {
  all: ["auth"] as const,
  lookup: () => [...authMutationKeys.all, "lookup"] as const,
  signIn: () => [...authMutationKeys.all, "sign-in"] as const,
  sendCode: () => [...authMutationKeys.all, "send-code"] as const,
  verifyCode: () => [...authMutationKeys.all, "verify-code"] as const,
  resetPassword: () => [...authMutationKeys.all, "reset-password"] as const,
  signOut: () => [...authMutationKeys.all, "sign-out"] as const,
  onboarding: () => [...authMutationKeys.all, "onboarding"] as const,
};
