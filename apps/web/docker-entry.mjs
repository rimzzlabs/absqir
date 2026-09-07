// Entrypoint for the Docker image: apply pending migrations, then start the
// server. Set SKIP_MIGRATIONS=true to manage the schema yourself. With
// --migrate-only the process exits after the migrations, for `absqir migrate`.
import { runMigrations } from "@absqir/db/migrate";

const migrateOnly = process.argv.includes("--migrate-only");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing required environment variable DATABASE_URL");
  process.exit(1);
}

const RETRIES = 10;
const RETRY_DELAY_MS = 2000;

if (migrateOnly || process.env.SKIP_MIGRATIONS !== "true") {
  const migrationsFolder = new URL("./migrations", import.meta.url).pathname;

  // The database container can accept connections a beat after this process
  // starts, so the first attempts may fail while Postgres boots.
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      await runMigrations({ connectionString, migrationsFolder });
      console.log("migrations: up to date");
      break;
    } catch (error) {
      if (attempt === RETRIES) {
        console.error("migrations: giving up", error);
        process.exit(1);
      }

      console.log(`migrations: database not ready, retry ${attempt}/${RETRIES}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

if (migrateOnly) {
  process.exit(0);
}

await import("./dist/server/entry.mjs");
