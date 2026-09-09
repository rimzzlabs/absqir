import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { callbackUrl, keysOf, PROVIDERS, type ProviderId } from "@/lib/providers";

const DEFAULT_APP_URL = "http://localhost:4321";

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
      GITHUB_CLIENT_ID: \${GITHUB_CLIENT_ID:-}
      GITHUB_CLIENT_SECRET: \${GITHUB_CLIENT_SECRET:-}
      GOOGLE_CLIENT_ID: \${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: \${GOOGLE_CLIENT_SECRET:-}
      ENVIRONMENT: production

volumes:
  db-data:
`;

/**
 * The OAuth block. A chosen provider gets empty keys the operator fills in
 * later; an empty value counts as unset, so the instance still starts. A
 * provider that was skipped stays commented out, as a hint that it exists.
 */
function oauthBlock(chosen: ProviderId[]): string {
  const lines = [
    "# Sign in with GitHub and Google. Set both keys of a pair, or neither:",
    "# one half alone stops the server. Register the callback address with the",
    "# provider first, and keep it in step with APP_URL.",
  ];

  for (const provider of PROVIDERS) {
    const [idKey, secretKey] = keysOf(provider.id);
    const prefix = chosen.includes(provider.id) ? "" : "# ";

    lines.push("");
    lines.push(`# ${provider.label}: ${provider.console}`);
    lines.push(`# Callback: ${callbackUrl(DEFAULT_APP_URL, provider.id)}`);
    lines.push(`${prefix}${idKey}=""`);
    lines.push(`${prefix}${secretKey}=""`);
  }

  return lines.join("\n");
}

function envTemplate(secret: string, dbPassword: string, chosen: ProviderId[]): string {
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

${oauthBlock(chosen)}
`;
}

/**
 * Asks once per provider. A pipe, a CI run, or --yes answers no: a prompt
 * nobody can see must never hold up an install.
 */
async function askProviders(skip: boolean): Promise<ProviderId[]> {
  if (skip || !process.stdin.isTTY) return [];

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const chosen: ProviderId[] = [];

  try {
    console.log("");
    console.log("Optional: let people sign in with a provider instead of an emailed code.");

    for (const provider of PROVIDERS) {
      const answer = await rl.question(`Add ${provider.label} sign-in? [y/N] `);

      if (/^y(es)?$/i.test(answer.trim())) chosen.push(provider.id);
    }
  } finally {
    rl.close();
  }

  return chosen;
}

/** What the operator has to do at the provider, printed where they are. */
function printProviderSteps(chosen: ProviderId[]): void {
  if (chosen.length === 0) return;

  console.log("");
  console.log("Sign-in providers:");

  for (const id of chosen) {
    const provider = PROVIDERS.find((entry) => entry.id === id);
    if (!provider) continue;

    const [idKey, secretKey] = keysOf(id);

    console.log("");
    console.log(`  ${provider.label}`);
    console.log(`    1. Register an app at ${provider.console}`);
    console.log(`    2. Set the callback to ${callbackUrl(DEFAULT_APP_URL, id)}`);
    console.log(`       Change it to match APP_URL when this instance moves.`);
    console.log(`    3. absqir config set ${idKey} <id>`);
    console.log(`       absqir config set ${secretKey} <secret>`);
  }

  console.log("");
  console.log("  The buttons appear once both keys of a pair hold a value.");
}

export async function init(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      force: { type: "boolean", default: false },
      yes: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const dir = resolve(positionals[0] ?? ".");
  const composePath = join(dir, "docker-compose.yml");
  const envPath = join(dir, ".env");

  if (!values.force && (existsSync(composePath) || existsSync(envPath))) {
    console.error(`Refusing to overwrite ${composePath} or ${envPath}. Use --force to replace.`);
    return 1;
  }

  const chosen = await askProviders(values.yes);

  mkdirSync(dir, { recursive: true });
  writeFileSync(composePath, COMPOSE_TEMPLATE);
  writeFileSync(
    envPath,
    envTemplate(
      randomBytes(32).toString("base64url"),
      randomBytes(16).toString("base64url"),
      chosen,
    ),
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

  printProviderSteps(chosen);

  return 0;
}
