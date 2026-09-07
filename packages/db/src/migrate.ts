import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

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
