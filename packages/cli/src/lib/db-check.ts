import type { CaptureComposeResult } from "#src/lib/compose";

export type DatabaseVerdict = "open" | "refused" | "not-running" | "unknown";

/** The compose arguments that ask Postgres, over TCP, to take the password. */
export function psqlProbeArgs(password: string): string[] {
  // -h db resolves to the container's own network address. The image trusts
  // the socket and the loopback address without a password, so only a
  // connection over the network makes Postgres check it.
  return [
    "exec",
    "-T",
    "-e",
    `PGPASSWORD=${password}`,
    "db",
    "psql",
    "-h",
    "db",
    "-U",
    "absqir",
    "-d",
    "absqir",
    "-tAc",
    "select 1",
  ];
}

/**
 * Reads the answer of the probe. Postgres reads POSTGRES_PASSWORD once, when
 * it creates its data volume, so a rewritten .env leaves the volume on the
 * old password, and the app can no longer open its own database.
 */
export function readPsqlProbe(result: CaptureComposeResult): DatabaseVerdict {
  if (result.code === 0 && result.output.trim().endsWith("1")) return "open";
  if (/password authentication failed/i.test(result.output)) return "refused";
  if (/is not running|no container found|has no container|not found/i.test(result.output)) {
    return "not-running";
  }

  return "unknown";
}
