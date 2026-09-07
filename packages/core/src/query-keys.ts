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

export const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

export const organizationKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
};

export const organizationMutationKeys = {
  all: ["organization-mutations"] as const,
  create: () => [...organizationMutationKeys.all, "create"] as const,
  setActive: () => [...organizationMutationKeys.all, "set-active"] as const,
};

export const attendanceKeys = {
  all: ["attendance"] as const,
  list: () => [...attendanceKeys.all, "list"] as const,
  detail: (id: string) => [...attendanceKeys.all, "detail", id] as const,
  records: (id: string) => [...attendanceKeys.all, "records", id] as const,
  qrToken: (id: string) => [...attendanceKeys.all, "qr-token", id] as const,
};

export const attendanceMutationKeys = {
  all: ["attendance-mutations"] as const,
  create: () => [...attendanceMutationKeys.all, "create"] as const,
  toggle: () => [...attendanceMutationKeys.all, "toggle"] as const,
  remove: () => [...attendanceMutationKeys.all, "remove"] as const,
  checkIn: () => [...attendanceMutationKeys.all, "check-in"] as const,
};

/** Mutation keys, so a pending sign-in can be observed from anywhere. */
export const authMutationKeys = {
  all: ["auth"] as const,
  signIn: () => [...authMutationKeys.all, "sign-in"] as const,
  signUp: () => [...authMutationKeys.all, "sign-up"] as const,
  signOut: () => [...authMutationKeys.all, "sign-out"] as const,
};
