import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export interface DatabaseErrorVerdict {
  /** True when a later attempt can succeed, for example while Postgres boots. */
  retry: boolean;
  /** One line for the operator, with the fix when there is one. */
  message: string;
}

/** Postgres SQLSTATE codes a fresh install can hit. */
const PASSWORD_REFUSED = "28P01";
const ROLE_REFUSED = "28000";
const NO_DATABASE = "3D000";
const STILL_STARTING = "57P03";

const BOOTING_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  STILL_STARTING,
]);

function findCode(error: unknown): string | undefined {
  let current: unknown = error;

  // drizzle wraps the pg error, and pg wraps a socket error. The code that
  // names the fault sits on the innermost one.
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = current.cause;
  }

  return undefined;
}

/**
 * Tells a fault that goes away on its own from one that never will. A wrong
 * password is the one a first install meets most: Postgres only reads
 * POSTGRES_PASSWORD when it creates its data volume, so a rewritten .env
 * leaves the volume on the old password.
 */
export function describeDatabaseError(error: unknown): DatabaseErrorVerdict {
  const code = findCode(error);

  if (code === PASSWORD_REFUSED || code === ROLE_REFUSED) {
    return {
      retry: false,
      message:
        "Postgres refused the password in DATABASE_URL. The database volume was created with a different POSTGRES_PASSWORD than the one in .env. Restore the old password, or delete the volume with `docker compose down -v` (this deletes the data) and start again.",
    };
  }

  if (code === NO_DATABASE) {
    return {
      retry: false,
      message:
        "The database named in DATABASE_URL does not exist. Postgres creates it only when it creates its data volume. Delete the volume with `docker compose down -v` (this deletes the data) and start again.",
    };
  }

  if (code && BOOTING_CODES.has(code)) {
    return { retry: true, message: "the database is not accepting connections yet" };
  }

  const text = error instanceof Error ? error.message : String(error);

  return { retry: true, message: text.split("\n")[0] ?? "unknown error" };
}

export interface RunMigrationsOptions {
  connectionString: string;
  /** Directory holding the SQL migrations and their meta journal. */
  migrationsFolder: string;
}

/**
 * Applies pending migrations and returns. The Docker entrypoint runs this
 * before the server starts, so `docker compose up` is always on the current
 * schema without shipping drizzle-kit in the production image.
 */
export async function runMigrations(options: RunMigrationsOptions): Promise<void> {
  const pool = new Pool({ connectionString: options.connectionString, max: 1 });

  try {
    const db = drizzle({ client: pool });
    await migrate(db, { migrationsFolder: options.migrationsFolder });
  } finally {
    await pool.end();
  }
}
