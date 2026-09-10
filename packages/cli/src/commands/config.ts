import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { A } from "@mobily/ts-belt";
import { usageOf } from "#src/lib/commands";
import { readEnvValue, setEnvValue } from "#src/lib/env-file";
import { UsageError } from "#src/lib/errors";
import * as ui from "#src/ui";

const ENV_PATH = ".env";

interface SettingInfo {
  key: string;
  hint: string;
  secret: boolean;
}

/** The keys the operator may change. Everything else is not configuration. */
const SETTINGS: SettingInfo[] = [
  { key: "APP_URL", hint: "the address people type", secret: false },
  { key: "PORT", hint: "the published port on this machine", secret: false },
  { key: "SECURE_COOKIES", hint: "true behind HTTPS", secret: false },
  { key: "REGISTRATION_OPEN", hint: "open sign-up to any email address", secret: false },
  { key: "ABSQIR_TAG", hint: "image tag `absqir upgrade` pulls", secret: false },
  { key: "RESEND_API_KEY", hint: "sign-in codes travel by email", secret: true },
  { key: "EMAIL_FROM", hint: "From address on every email", secret: false },
  { key: "GITHUB_CLIENT_ID", hint: "GitHub sign-in", secret: false },
  { key: "GITHUB_CLIENT_SECRET", hint: "GitHub sign-in", secret: true },
  { key: "GOOGLE_CLIENT_ID", hint: "Google sign-in", secret: false },
  { key: "GOOGLE_CLIENT_SECRET", hint: "Google sign-in", secret: true },
];

function settingOf(key: string): SettingInfo | undefined {
  return A.getBy([...SETTINGS], (setting) => setting.key === key) ?? undefined;
}

function requireEnvFile(): void {
  if (existsSync(ENV_PATH)) return;

  throw new UsageError("No .env here. Run `absqir init`, or cd into the instance directory.");
}

export async function configSet(argv: string[]): Promise<number> {
  requireEnvFile();

  const [flagKey, flagValue] = argv;

  if (flagKey && !settingOf(flagKey)) {
    throw new UsageError(
      `Unknown key ${flagKey}. Known: ${A.map([...SETTINGS], (setting) => setting.key).join(", ")}`,
    );
  }

  if (!flagKey && !ui.isRich()) throw new UsageError(usageOf("config set"));
  if (flagKey && flagValue === undefined && !ui.isRich())
    throw new UsageError(usageOf("config set"));

  ui.intro("absqir config set");

  const key =
    flagKey ??
    (await ui.select({
      message: "Which setting?",
      flag: "a KEY",
      options: A.map([...SETTINGS], (setting) => ({
        value: setting.key,
        label: setting.key,
        hint: setting.hint,
      })),
    }));

  const setting = settingOf(key);
  const current = readEnvValue(ENV_PATH, key) ?? "";

  const value =
    flagValue ??
    (setting?.secret
      ? await ui.password({ message: `New value for ${key}`, flag: "a value" })
      : await ui.text({
          message: `New value for ${key}`,
          flag: "a value",
          placeholder: current || "empty",
          defaultValue: current,
        }));

  setEnvValue({ path: ENV_PATH, key, value });

  ui.success(`${key} is set.`);
  ui.outro("Run `absqir up` to apply it.");

  return 0;
}

function maskedValue(params: { setting: SettingInfo | undefined; value: string }): string {
  if (!params.setting?.secret || params.value.length === 0) return params.value;

  return "********";
}

export function configGet(argv: string[]): number {
  requireEnvFile();

  const { values, positionals } = parseArgs({
    args: argv,
    options: { reveal: { type: "boolean", default: false } },
    allowPositionals: true,
  });

  const [key] = positionals;

  if (key) {
    const value = readEnvValue(ENV_PATH, key);

    if (value === null) {
      ui.fail(`${key} is not in ${ENV_PATH}.`);
      return 1;
    }

    ui.raw(values.reveal ? value : maskedValue({ setting: settingOf(key), value }));
    return 0;
  }

  for (const setting of SETTINGS) {
    const value = readEnvValue(ENV_PATH, setting.key);
    if (value === null) continue;

    ui.raw(`${setting.key}=${values.reveal ? value : maskedValue({ setting, value })}`);
  }

  if (!values.reveal && ui.isRich()) ui.info("Secrets are masked. Add --reveal to print them.");

  return 0;
}
