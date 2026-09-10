import { A } from "@mobily/ts-belt";
import { callbackUrl, keysOf, PROVIDERS, type ProviderId } from "#src/lib/providers";

export const DEFAULT_APP_URL = "http://localhost:4321";

/** RFC 2606 keeps example.com unregistrable, so this address can never be real. */
export const EXAMPLE_APP_URL = "https://absqir.example.com";
export const DEFAULT_EMAIL_FROM = "absqir <onboarding@resend.dev>";

/** Where the operator picks up a mail key, and where a domain is verified. */
export const RESEND = {
  keys: "https://resend.com/api-keys",
  domains: "https://resend.com/domains",
} as const;

/** A provider the operator picked, with whatever keys they had to hand. */
export interface ProviderCredential {
  id: ProviderId;
  clientId: string;
  clientSecret: string;
}

export const COMPOSE_TEMPLATE = `# absqir self-host stack. Secrets live in the .env file next to this file.
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

interface OauthBlockParams {
  appUrl: string;
  providers: readonly ProviderCredential[];
}

/**
 * The OAuth block. A picked provider gets the keys the operator typed, or
 * empty keys to fill in later. An empty value counts as unset, so the
 * instance still starts. A provider nobody picked stays commented out, as a
 * hint that it exists.
 */
function oauthBlock(params: OauthBlockParams): string {
  const lines = [
    "# Sign in with GitHub and Google. Set both keys of a pair, or neither:",
    "# one half alone stops the server. Register the callback address with the",
    "# provider first, and keep it in step with APP_URL.",
  ];

  for (const provider of PROVIDERS) {
    const [idKey, secretKey] = keysOf(provider.id);
    const picked = A.getBy(params.providers, (entry) => entry.id === provider.id);
    const prefix = picked ? "" : "# ";

    lines.push("");
    lines.push(`# ${provider.label}: ${provider.console}`);
    lines.push(`# Callback: ${callbackUrl(params.appUrl, provider.id)}`);
    lines.push(`${prefix}${idKey}="${picked?.clientId ?? ""}"`);
    lines.push(`${prefix}${secretKey}="${picked?.clientSecret ?? ""}"`);
  }

  return lines.join("\n");
}

export interface EnvTemplateParams {
  secret: string;
  dbPassword: string;
  appUrl: string;
  resendKey: string;
  emailFrom: string;
  registrationOpen: boolean;
  providers: readonly ProviderCredential[];
}

export function envTemplate(params: EnvTemplateParams): string {
  return `# Written by \`absqir init\`. Keep this file out of version control.
BETTER_AUTH_SECRET="${params.secret}"
POSTGRES_PASSWORD="${params.dbPassword}"

# The published port on this machine.
PORT="4321"

# Set to true when the instance is behind HTTPS. Over plain http the browser
# drops Secure cookies and sign-in fails silently.
SECURE_COOKIES="${params.appUrl.startsWith("https://") ? "true" : "false"}"

# Required. Sign-in codes and invitations travel by email through Resend.
# Get a key at https://resend.com, then set the From address to a domain
# you verified there.
RESEND_API_KEY="${params.resendKey}"
EMAIL_FROM="${params.emailFrom}"

# Who can create an account, after your first one. With "false" a person needs
# an invitation, or the public page of an open event. With "true" any email
# address can create an account, and every account can create organizations.
REGISTRATION_OPEN="${params.registrationOpen}"

# Where this instance answers. Links in a reminder email point here, so set
# it to the address people type, with the scheme.
APP_URL="${params.appUrl}"

# Image tag to run. \`absqir upgrade\` pulls this tag again.
ABSQIR_TAG="latest"

${oauthBlock({ appUrl: params.appUrl, providers: params.providers })}
`;
}

export interface ProviderStepsParams {
  appUrl: string;
  providers: readonly ProviderCredential[];
}

/**
 * What is left to do, for a provider that was picked with empty keys. A
 * provider whose keys arrived in the flow needs no steps.
 */
export function pendingProviderSteps(params: ProviderStepsParams): string[] {
  const lines: string[] = [];

  for (const credential of params.providers) {
    if (credential.clientId && credential.clientSecret) continue;

    const provider = A.getBy(PROVIDERS, (entry) => entry.id === credential.id);
    if (!provider) continue;

    const [idKey, secretKey] = keysOf(credential.id);

    if (lines.length > 0) lines.push("");

    lines.push(`${provider.label} keys are still empty`);
    lines.push(`  1. Register an app at ${provider.console}`);
    lines.push(`  2. Set the callback to ${callbackUrl(params.appUrl, credential.id)}`);
    lines.push(`  3. absqir config set ${idKey} <id>`);
    lines.push(`     absqir config set ${secretKey} <secret>`);
  }

  if (lines.length > 0) {
    lines.push("");
    lines.push("The button appears once both keys of a pair hold a value.");
  }

  return lines;
}
