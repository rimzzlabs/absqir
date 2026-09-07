import { createEnv } from "@t3-oss/env-core";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { z } from "zod";

config({ path: "../../.env", quiet: true });

const env = createEnv({
  server: { DATABASE_URL: z.string().min(1) },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: env.DATABASE_URL },
  strict: true,
  verbose: true,
});
