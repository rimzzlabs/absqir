/**
 * Where notifications reach an account. Kept out of the database package
 * so a browser island can list the choices without pulling drizzle in.
 * The choice is copied onto each notification at write time, so a later
 * change never rewrites history.
 */
export const NOTIFICATION_CHANNELS = ["all", "in-app", "email", "none"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export function isNotificationChannel(value: unknown): value is NotificationChannel {
  return typeof value === "string" && (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}
