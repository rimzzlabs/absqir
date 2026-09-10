import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "#src/schema";

// A Worker invocation may hold at most 6 connections to Hyperdrive.
const MAX_CONNECTIONS = 5;

export interface CreateDbOptions {
  connectionString: string;
  max?: number;
}

export interface DbHandle {
  db: Database;
  close: () => Promise<void>;
}

/**
 * Opens one pool for one Worker invocation. Pass close() to ctx.waitUntil so
 * the connections are released after the response is sent.
 */
export function createDb(options: CreateDbOptions): DbHandle {
  const { connectionString, max = MAX_CONNECTIONS } = options;
  const pool = new Pool({ connectionString, max });

  return {
    db: drizzle({ client: pool, schema }),
    close: () => pool.end(),
  };
}

export type Database = NodePgDatabase<typeof schema>;

export { schema };
