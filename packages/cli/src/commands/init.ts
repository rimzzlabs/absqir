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
    image: ghcr.io/rimzzlabs/absqir:\${ABSQIR_TAG:-latest}
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
      RESEND_API_KEY: \${RESEND_API_KEY:?Set RESEND_API_KEY in .env, sign-up codes travel by email}
      EMAIL_FROM: \${EMAIL_FROM:-absqir <onboarding@resend.dev>}
      APP_URL: \${APP_URL:-http://localhost:4321}
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

# Required. Sign-in codes and invitations travel by email through Resend.
# Get a key at https://resend.com, then set the From address to a domain
# you verified there.
RESEND_API_KEY=""
EMAIL_FROM="absqir <onboarding@resend.dev>"

# Lets every account create organizations. Off by default: only the first
# account and accounts promoted with \`absqir admin promote\` can. Joining
# through an invitation never needs this.
REGISTRATION_OPEN="false"

# Where this instance answers. Links in a reminder email point here, so set
# it to the address people type, with the scheme.
APP_URL="http://localhost:4321"

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
  console.log("  1. absqir config set RESEND_API_KEY re_...   codes and invitations go by email");
  console.log("  2. absqir up                                 start the stack");
  console.log("  3. open http://localhost:4321, enter your email, and create the first account");
  console.log("  4. absqir doctor                             check the instance");

  return 0;
}
