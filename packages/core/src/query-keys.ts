/**
 * Every TanStack Query key in the app is built here. Keys drift when they are
 * written inline, and a cache read then stops matching the cache write.
 */
export const sessionKeys = {
  all: ["event"] as const,
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
  leave: () => [...organizationMutationKeys.all, "leave"] as const,
  delete: () => [...organizationMutationKeys.all, "delete"] as const,
};

export const domainKeys = {
  all: ["domains"] as const,
  list: () => [...domainKeys.all, "list"] as const,
};

export const domainMutationKeys = {
  all: ["domain-mutations"] as const,
  claim: () => [...domainMutationKeys.all, "claim"] as const,
  verify: () => [...domainMutationKeys.all, "verify"] as const,
  release: () => [...domainMutationKeys.all, "release"] as const,
  policy: () => [...domainMutationKeys.all, "policy"] as const,
};

export const joinRequestKeys = {
  all: ["join-requests"] as const,
  list: (status = "pending") => [...joinRequestKeys.all, "list", status] as const,
};

export const joinRequestMutationKeys = {
  all: ["join-request-mutations"] as const,
  ask: () => [...joinRequestMutationKeys.all, "ask"] as const,
  withdraw: () => [...joinRequestMutationKeys.all, "withdraw"] as const,
  decide: () => [...joinRequestMutationKeys.all, "decide"] as const,
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

export interface EventListFilter {
  scope: "upcoming" | "past" | "all";
  q: string;
  groupId: string;
}

export const eventKeys = {
  all: ["events"] as const,
  /** Every page of every list. Mutations invalidate this prefix. */
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filter: EventListFilter) => [...eventKeys.lists(), filter] as const,
  detail: (id: string) => [...eventKeys.all, "detail", id] as const,
  records: (id: string) => [...eventKeys.all, "records", id] as const,
  qrToken: (id: string) => [...eventKeys.all, "qr-token", id] as const,
};

export const eventMutationKeys = {
  all: ["event-mutations"] as const,
  create: () => [...eventMutationKeys.all, "create"] as const,
  update: () => [...eventMutationKeys.all, "update"] as const,
  remove: () => [...eventMutationKeys.all, "remove"] as const,
  open: () => [...eventMutationKeys.all, "open"] as const,
  close: () => [...eventMutationKeys.all, "close"] as const,
  setRecord: () => [...eventMutationKeys.all, "set-record"] as const,
  checkIn: () => [...eventMutationKeys.all, "check-in"] as const,
  scan: () => [...eventMutationKeys.all, "scan"] as const,
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
  /** Every page of every scope. Mutations invalidate this prefix. */
  events: () => [...myKeys.all, "events"] as const,
  eventsPage: (scope: string, limit: number | null = null) =>
    [...myKeys.events(), scope, limit] as const,
  pass: (id: string) => [...myKeys.all, "pass", id] as const,
  history: () => [...myKeys.all, "history"] as const,
};

export const publicEventKeys = {
  all: ["events"] as const,
  detail: (id: string) => [...publicEventKeys.all, "detail", id] as const,
};

export const publicEventMutationKeys = {
  all: ["event-mutations"] as const,
  register: () => [...publicEventMutationKeys.all, "register"] as const,
  withdraw: () => [...publicEventMutationKeys.all, "withdraw"] as const,
};

export const leaveKeys = {
  all: ["leave"] as const,
  queue: (status = "pending") => [...leaveKeys.all, "queue", status] as const,
  /** Every page of every scope of my own requests. */
  mine: () => [...leaveKeys.all, "mine"] as const,
  minePage: (scope: string, limit: number | null = null) =>
    [...leaveKeys.mine(), scope, limit] as const,
};

export const leaveMutationKeys = {
  all: ["leave-mutations"] as const,
  ask: () => [...leaveMutationKeys.all, "ask"] as const,
  withdraw: () => [...leaveMutationKeys.all, "withdraw"] as const,
  decide: () => [...leaveMutationKeys.all, "decide"] as const,
};

export const reportKeys = {
  all: ["reports"] as const,
  summary: (range: string) => [...reportKeys.all, "summary", range] as const,
  people: (range: string) => [...reportKeys.all, "people", range] as const,
  groups: (range: string) => [...reportKeys.all, "groups", range] as const,
  events: (range: string) => [...reportKeys.all, "events", range] as const,
};

export const calendarKeys = {
  all: ["calendar"] as const,
  range: (from: string, to: string) => [...calendarKeys.all, "range", from, to] as const,
};

export const notificationKeys = {
  all: ["notifications"] as const,
  /** Every list, whatever its scope. The stream invalidates this prefix. */
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (scope = "all") => [...notificationKeys.lists(), scope] as const,
  unread: () => [...notificationKeys.all, "unread"] as const,
};

export const notificationMutationKeys = {
  all: ["notification-mutations"] as const,
  read: () => [...notificationMutationKeys.all, "read"] as const,
  readAll: () => [...notificationMutationKeys.all, "read-all"] as const,
};

export const accountKeys = {
  all: ["account"] as const,
  devices: () => [...accountKeys.all, "devices"] as const,
  credentials: () => [...accountKeys.all, "credentials"] as const,
};

export const accountMutationKeys = {
  all: ["account-mutations"] as const,
  profile: () => [...accountMutationKeys.all, "profile"] as const,
  requestEmailChange: () => [...accountMutationKeys.all, "request-email-change"] as const,
  confirmEmailChange: () => [...accountMutationKeys.all, "confirm-email-change"] as const,
  changePassword: () => [...accountMutationKeys.all, "change-password"] as const,
  notificationChannel: () => [...accountMutationKeys.all, "notification-channel"] as const,
  timezone: () => [...accountMutationKeys.all, "timezone"] as const,
  revokeSession: () => [...accountMutationKeys.all, "revoke-session"] as const,
  revokeOtherSessions: () => [...accountMutationKeys.all, "revoke-other-sessions"] as const,
  setPassword: () => [...accountMutationKeys.all, "set-password"] as const,
  linkProvider: () => [...accountMutationKeys.all, "link-provider"] as const,
  unlinkProvider: () => [...accountMutationKeys.all, "unlink-provider"] as const,
  deleteAccount: () => [...accountMutationKeys.all, "delete-account"] as const,
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
