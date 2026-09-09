import { existsSync } from "node:fs";
import { dockerAvailable } from "@/lib/compose";
import { readEnvValue } from "@/lib/env-file";
import { callbackUrl, keysOf, PROVIDERS } from "@/lib/providers";
import * as ui from "@/ui";

const MIN_SECRET_LENGTH = 32;

export interface CheckResult {
  label: string;
  ok: boolean;
  hint?: string;
}

async function healthCheck(port: string): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/** Every check except the health request, which is the one slow step. */
export async function collectChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  results.push({
    label: "docker is installed",
    ok: await dockerAvailable(),
    hint: "Install Docker: https://docs.docker.com/engine/install/",
  });

  const hasCompose = existsSync("docker-compose.yml");
  results.push({
    label: "docker-compose.yml is here",
    ok: hasCompose,
    hint: "Run `absqir init`, or cd into the instance directory.",
  });

  const hasEnv = existsSync(".env");
  results.push({
    label: ".env is here",
    ok: hasEnv,
    hint: "Run `absqir init`, or cd into the instance directory.",
  });

  if (!hasEnv) return results;

  const secret = readEnvValue(".env", "BETTER_AUTH_SECRET") ?? "";
  results.push({
    label: `BETTER_AUTH_SECRET has ${MIN_SECRET_LENGTH}+ characters`,
    ok: secret.length >= MIN_SECRET_LENGTH,
    hint: "Generate one: openssl rand -base64 32",
  });

  const mailKey = readEnvValue(".env", "RESEND_API_KEY") ?? "";
  results.push({
    label: "RESEND_API_KEY is set",
    ok: mailKey.length > 0,
    hint: "Sign-in codes travel by email. Set it: absqir config set RESEND_API_KEY re_...",
  });

  const appUrl = readEnvValue(".env", "APP_URL") ?? "";

  for (const provider of PROVIDERS) {
    const [idKey, secretKey] = keysOf(provider.id);
    const id = readEnvValue(".env", idKey) ?? "";
    const providerSecret = readEnvValue(".env", secretKey) ?? "";

    if (!id && !providerSecret) continue;

    results.push({
      label: `${provider.label} sign-in has both keys`,
      ok: Boolean(id) && Boolean(providerSecret),
      hint: `Set the missing one: absqir config set ${id ? secretKey : idKey} ...`,
    });

    // The provider refuses a callback it does not know, and says so on its
    // own page, where absqir cannot explain anything.
    results.push({
      label: `${provider.label} callback matches a public APP_URL`,
      ok: appUrl.length > 0 && !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1"),
      hint: `Set APP_URL to the address people type, then register ${callbackUrl(appUrl || "https://absqir.example.com", provider.id)} with ${provider.label}.`,
    });
  }

  return results;
}

export async function doctor(): Promise<number> {
  ui.intro("absqir doctor");

  const results = await collectChecks();

  // The file and secret checks are instant. They print first, so the operator
  // reads them while the health request runs.
  for (const result of results) ui.check(result);

  const port = (existsSync(".env") ? readEnvValue(".env", "PORT") : null) ?? "4321";

  const healthy = await ui.spin({
    start: `Asking http://localhost:${port}/api/health`,
    stop: `Checked http://localhost:${port}/api/health`,
    task: () => healthCheck(port),
  });

  const health: CheckResult = {
    label: `the app answers on http://localhost:${port}/api/health`,
    ok: healthy,
    hint: "Start it with `absqir up`, then read `absqir logs`.",
  };

  results.push(health);
  ui.check(health);

  const failed = results.filter((result) => !result.ok).length;

  if (failed === 0) {
    ui.outro("All checks passed.");
    return 0;
  }

  ui.outroError(failed === 1 ? "1 check failed." : `${failed} checks failed.`);

  return 1;
}
