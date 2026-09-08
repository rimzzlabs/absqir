import { existsSync } from "node:fs";
import { readEnvValue, setEnvValue } from "@/lib/env-file";

/** The keys the operator may change. Everything else is not configuration. */
const ALLOWED_KEYS = new Set([
  "PORT",
  "SECURE_COOKIES",
  "REGISTRATION_OPEN",
  "ABSQIR_TAG",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "APP_URL",
]);

const ENV_PATH = ".env";

export function configSet(argv: string[]): number {
  const [key, value] = argv;

  if (!key || value === undefined) {
    console.error("Usage: absqir config set <KEY> <value>");
    return 1;
  }

  if (!ALLOWED_KEYS.has(key)) {
    console.error(`Unknown key ${key}. Allowed: ${[...ALLOWED_KEYS].join(", ")}`);
    return 1;
  }

  if (!existsSync(ENV_PATH)) {
    console.error("No .env here. Run `absqir init` first, or cd into the instance directory.");
    return 1;
  }

  setEnvValue({ path: ENV_PATH, key, value });
  console.log(`${key} set. Run \`absqir up\` to apply it.`);

  return 0;
}

export function configGet(argv: string[]): number {
  if (!existsSync(ENV_PATH)) {
    console.error("No .env here. Run `absqir init` first, or cd into the instance directory.");
    return 1;
  }

  const [key] = argv;

  if (key) {
    const value = readEnvValue(ENV_PATH, key);
    console.log(value ?? "");
    return value === null ? 1 : 0;
  }

  for (const name of ALLOWED_KEYS) {
    const value = readEnvValue(ENV_PATH, name);
    if (value !== null) console.log(`${name}=${value}`);
  }

  return 0;
}
