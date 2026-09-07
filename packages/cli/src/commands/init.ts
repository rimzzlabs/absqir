import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const COMPOSE_TEMPLATE = `# absqir self-host stack. Secrets live in the .env file next to this file.
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: absqir
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
      POSTGRES_DB: absqir
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U absqir -d absqir"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    image: ghcr.io/absqir/absqir:\${ABSQIR_TAG:-latest}
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "\${PORT:-4321}:4321"
    environment:
      DATABASE_URL: postgresql://absqir:\${POSTGRES_PASSWORD}@db:5432/absqir
      BETTER_AUTH_SECRET: \${BETTER_AUTH_SECRET:?Set BETTER_AUTH_SECRET in .env}
      SECURE_COOKIES: \${SECURE_COOKIES:-false}
      REGISTRATION_OPEN: \${REGISTRATION_OPEN:-false}
      ENVIRONMENT: production

volumes:
  db-data:
`;

function envTemplate(secret: string, dbPassword: string): string {
  return `# Written by \`absqir init\`. Keep this file out of version control.
BETTER_AUTH_SECRET="${secret}"
POSTGRES_PASSWORD="${dbPassword}"

# The published port on this machine.
PORT="4321"

# Set to true when the instance is behind HTTPS. Over plain http the browser
# drops Secure cookies and sign-in fails silently.
SECURE_COOKIES="false"

# Sign-up closes after the first user. Set to true to keep it open.
REGISTRATION_OPEN="false"

# Image tag to run. \`absqir upgrade\` pulls this tag again.
ABSQIR_TAG="latest"
`;
}

export async function init(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: { force: { type: "boolean", default: false } },
    allowPositionals: true,
  });

  const dir = resolve(positionals[0] ?? ".");
  const composePath = join(dir, "docker-compose.yml");
  const envPath = join(dir, ".env");

  if (!values.force && (existsSync(composePath) || existsSync(envPath))) {
    console.error(`Refusing to overwrite ${composePath} or ${envPath}. Use --force to replace.`);
    return 1;
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(composePath, COMPOSE_TEMPLATE);
  writeFileSync(
    envPath,
    envTemplate(randomBytes(32).toString("base64url"), randomBytes(16).toString("base64url")),
    { mode: 0o600 },
  );

  console.log(`Wrote ${composePath}`);
  console.log(`Wrote ${envPath} (secrets generated)`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. absqir up          start the stack");
  console.log("  2. open http://localhost:4321 and create the first account");
  console.log("  3. absqir doctor      check the instance");

  return 0;
}
