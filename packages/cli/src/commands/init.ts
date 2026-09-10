import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { A } from "@mobily/ts-belt";
import { UsageError } from "#src/lib/errors";
import { callbackUrl, keysOf, PROVIDERS, type ProviderId } from "#src/lib/providers";
import {
  COMPOSE_TEMPLATE,
  DEFAULT_APP_URL,
  DEFAULT_EMAIL_FROM,
  EXAMPLE_APP_URL,
  envTemplate,
  type ProviderCredential,
  pendingProviderSteps,
  RESEND,
} from "#src/lib/templates";
import * as ui from "#src/ui";

function validateAppUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!/^https?:\/\/\S+$/.test(value)) return "Start the address with http:// or https://";

  return undefined;
}

/** The .env writer wraps a value in double quotes, so a value cannot hold one. */
function validateNoQuote(value: string | undefined): string | undefined {
  if (value?.includes('"')) return "Remove the double quote. The .env file cannot hold one.";

  return undefined;
}

/**
 * Two answers, because the address decides more than it looks like. It goes
 * into every reminder email, into the provider callbacks, and into
 * SECURE_COOKIES. A localhost default would quietly hand a server install the
 * wrong one of each.
 */
async function askAppUrl(): Promise<string> {
  const where = await ui.select<"local" | "domain">({
    message: "Where will people reach this instance?",
    flag: "--app-url",
    initialValue: "local",
    options: [
      { value: "local", label: "This machine, for a try", hint: DEFAULT_APP_URL },
      { value: "domain", label: "A domain", hint: EXAMPLE_APP_URL },
    ],
  });

  if (where === "local") return DEFAULT_APP_URL;

  const typed = await ui.text({
    message: "The address people will type",
    flag: "--app-url",
    placeholder: EXAMPLE_APP_URL,
    validate: (value) => {
      if (!value) return "Enter the address, with the scheme.";

      return validateAppUrl(value);
    },
  });

  if (typed.startsWith("http://")) {
    ui.warn(
      "Over plain http a sign-in code travels unprotected. Put the instance behind HTTPS before you invite people.",
    );
  }

  return typed;
}

function parseProviders(values: string[]): ProviderId[] {
  const known = A.map([...PROVIDERS], (provider) => provider.id as string);

  for (const value of values) {
    if (!known.includes(value)) {
      throw new UsageError(`Unknown provider ${value}. Known: ${known.join(", ")}`);
    }
  }

  return values as ProviderId[];
}

interface AskCredentialsParams {
  appUrl: string;
  chosen: ProviderId[];
}

/**
 * Walks the operator through one provider console at a time. The callback
 * address comes first, because the provider refuses a callback it does not
 * know, and it refuses it on its own page where absqir cannot explain
 * anything. An empty ID skips the secret: one half of a pair alone stops the
 * server, so both keys stay empty together.
 */
async function askCredentials(params: AskCredentialsParams): Promise<ProviderCredential[]> {
  const credentials: ProviderCredential[] = [];

  for (const id of params.chosen) {
    const provider = A.getBy([...PROVIDERS], (entry) => entry.id === id);
    if (!provider) continue;

    const [idKey, secretKey] = keysOf(id);

    ui.note({
      title: `${provider.label} sign-in`,
      lines: [
        `1. Open ${provider.console}`,
        "2. Register an app, and set its callback to:",
        `   ${callbackUrl(params.appUrl, id)}`,
        "3. Copy the client ID and the client secret back here.",
        "",
        "Leave the ID empty to set both keys later.",
      ],
    });

    const clientId = await ui.text({
      message: `${provider.label} client ID`,
      flag: `absqir config set ${idKey} <id>`,
      placeholder: "leave it empty to set it later",
      defaultValue: "",
      validate: validateNoQuote,
    });

    if (!clientId) {
      credentials.push({ id, clientId: "", clientSecret: "" });
      continue;
    }

    const clientSecret = await ui.password({
      message: `${provider.label} client secret`,
      flag: `absqir config set ${secretKey} <secret>`,
      validate: (value) => {
        if (!value) return "The secret cannot stay empty next to an ID.";

        return validateNoQuote(value);
      },
    });

    credentials.push({ id, clientId, clientSecret });
  }

  return credentials;
}

export async function init(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      force: { type: "boolean", default: false },
      yes: { type: "boolean", default: false },
      "app-url": { type: "string" },
      "resend-key": { type: "string" },
      "email-from": { type: "string" },
      "registration-open": { type: "boolean" },
      provider: { type: "string", multiple: true },
    },
    allowPositionals: true,
  });

  const guided = ui.isRich() && !values.yes;

  ui.intro("absqir init");

  const target =
    positionals[0] ??
    (guided
      ? await ui.text({
          message: "Where do the files go?",
          flag: "a directory",
          placeholder: ".",
          defaultValue: ".",
        })
      : ".");

  const dir = resolve(target);
  const composePath = join(dir, "docker-compose.yml");
  const envPath = join(dir, ".env");
  const occupied = existsSync(composePath) || existsSync(envPath);

  if (occupied && !values.force) {
    if (!guided) {
      throw new UsageError(
        `${composePath} or ${envPath} is already here. Use --force to replace it.`,
      );
    }

    const replace = await ui.confirm({
      message: `${dir} already holds an instance. Replace docker-compose.yml and .env?`,
      flag: "--force",
      initialValue: false,
    });

    if (!replace) {
      ui.outro("Nothing was written.");
      return 1;
    }
  }

  const appUrlFlag = values["app-url"];
  const flagError = validateAppUrl(appUrlFlag);
  if (flagError) throw new UsageError(`${flagError} (--app-url)`);

  const appUrl = (appUrlFlag ?? (guided ? await askAppUrl() : DEFAULT_APP_URL)).replace(/\/+$/, "");

  if (guided && values["registration-open"] === undefined) {
    ui.note({
      title: "Who can join",
      lines: [
        "Your first account is always allowed. It is yours, and it can create",
        "organizations.",
        "",
        "Invite only: a person needs an invitation, or the public page of an",
        "open event.",
        "Open: any email address can create an account and an organization.",
      ],
    });
  }

  const registrationOpen =
    values["registration-open"] ??
    (guided
      ? (await ui.select<"invite" | "open">({
          message: "After your own account, who can join?",
          flag: "--registration-open",
          initialValue: "invite",
          options: [
            { value: "invite", label: "Invite only", hint: "an office, a school, a team" },
            {
              value: "open",
              label: "Anyone with an email address",
              hint: "a public community",
            },
          ],
        })) === "open"
      : false);

  if (guided && values["resend-key"] === undefined) {
    ui.note({
      title: "Email",
      lines: [
        "Sign-in codes and invitations travel by email through Resend.",
        "",
        `1. Open ${RESEND.keys}`,
        "2. Create an API key with send access.",
        "3. Copy the key back here.",
        "",
        "Leave it empty to set it later.",
      ],
    });
  }

  const resendKey =
    values["resend-key"] ??
    (guided
      ? await ui.password({
          message: "Resend API key",
          flag: "--resend-key",
          validate: validateNoQuote,
        })
      : "");

  const emailFrom =
    values["email-from"] ??
    (guided && resendKey
      ? await ui.text({
          message: "From address on every email",
          flag: "--email-from",
          placeholder: DEFAULT_EMAIL_FROM,
          defaultValue: DEFAULT_EMAIL_FROM,
          validate: validateNoQuote,
        })
      : DEFAULT_EMAIL_FROM);

  const askProviders = async () => {
    if (!guided) return [];

    return ui.multiselect<ProviderId>({
      message: "Sign-in providers, on top of the emailed code",
      flag: "--provider",
      options: A.map([...PROVIDERS], (provider) => ({
        value: provider.id,
        label: provider.label,
        hint: "absqir asks for the keys next",
      })),
    });
  };

  const chosen = values.provider ? parseProviders(values.provider) : await askProviders();

  const providers = guided
    ? await askCredentials({ appUrl, chosen })
    : A.map(chosen, (id) => ({ id, clientId: "", clientSecret: "" }));

  mkdirSync(dir, { recursive: true });
  writeFileSync(composePath, COMPOSE_TEMPLATE);
  writeFileSync(
    envPath,
    envTemplate({
      secret: randomBytes(32).toString("base64url"),
      dbPassword: randomBytes(16).toString("base64url"),
      appUrl,
      resendKey,
      emailFrom,
      registrationOpen,
      providers,
    }),
    { mode: 0o600 },
  );

  ui.success(`Wrote ${composePath}`);
  ui.success(`Wrote ${envPath} with fresh secrets`);

  if (resendKey && emailFrom.includes("onboarding@resend.dev")) {
    ui.warn(
      `The From address still uses onboarding@resend.dev. It reaches only the address that owns the Resend account. Verify a domain at ${RESEND.domains}.`,
    );
  }

  for (const credential of providers) {
    if (!credential.clientId || !credential.clientSecret) continue;

    const provider = A.getBy([...PROVIDERS], (entry) => entry.id === credential.id);
    if (provider) ui.success(`${provider.label} sign-in is ready.`);
  }

  const next = resendKey
    ? []
    : ["absqir config set RESEND_API_KEY re_...   codes and invitations go by email"];

  ui.note({
    title: "Next steps",
    lines: [
      ...next,
      "absqir up                                start the stack",
      `open ${appUrl} and create the first account`,
      "absqir doctor                            check the instance",
    ],
  });

  const steps = pendingProviderSteps({ appUrl, providers });
  if (steps.length > 0) ui.note({ title: "Still to do", lines: steps });

  ui.outro("The instance is ready to start.");

  return 0;
}
