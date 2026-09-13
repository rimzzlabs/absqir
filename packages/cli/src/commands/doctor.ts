import { existsSync } from "node:fs";
import { A } from "@mobily/ts-belt";
import { match, P } from "ts-pattern";
import { confirmReset, resetAndStart } from "#src/commands/db";
import { captureCompose, dockerAvailable } from "#src/lib/compose";
import { psqlProbeArgs, readPsqlProbe } from "#src/lib/db-check";
import { readEnvValue } from "#src/lib/env-file";
import { nextSteps } from "#src/lib/next-steps";
import { callbackUrl, keysOf, PROVIDERS } from "#src/lib/providers";
import { DEFAULT_APP_URL } from "#src/lib/templates";
import * as ui from "#src/ui";

const MIN_SECRET_LENGTH = 32;

export interface CheckResult {
  label: string;
  ok: boolean;
  hint?: string;
  /** Set on the one failure doctor can repair on the spot. */
  repair?: "reset-database";
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
      hint: `Set the missing one: absqir config set ${match(id)
        .with(P.string.minLength(1), () => secretKey)
        .otherwise(() => idKey)} ...`,
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

/**
 * Asks Postgres itself whether it takes the password in .env. The app log
 * would say the same, but only while the app container is up, and the
 * answer here comes with the repair.
 */
async function databaseCheck(): Promise<CheckResult> {
  const password = readEnvValue(".env", "POSTGRES_PASSWORD") ?? "";
  const verdict = readPsqlProbe(await captureCompose({ args: psqlProbeArgs(password) }));

  switch (verdict) {
    case "open":
      return { label: "the database takes the password in .env", ok: true };
    case "refused":
      return {
        label: "the database takes the password in .env",
        ok: false,
        hint: "Postgres reads POSTGRES_PASSWORD once, when it creates its data volume. Restore the old password with `absqir config set POSTGRES_PASSWORD ...`, or delete the volume with `absqir db reset` (this deletes the data).",
        repair: "reset-database",
      };
    case "not-running":
      return {
        label: "the database container is running",
        ok: false,
        hint: "Start it with `absqir up`.",
      };
    default:
      return {
        label: "the database answers",
        ok: false,
        hint: "Read `absqir logs` for what the app sees.",
      };
  }
}

function mailKeyIsSet(): boolean {
  return (readEnvValue(".env", "RESEND_API_KEY") ?? "").length > 0;
}

export async function doctor(): Promise<number> {
  ui.intro("absqir doctor");

  const results = await collectChecks();

  // The file and secret checks are instant. They print first, so the operator
  // reads them while the health request runs.
  for (const result of results) ui.check(result);

  const database = await match(existsSync(".env"))
    .with(
      true,
      async () =>
        await ui.spin({
          start: "Asking Postgres to take the password in .env",
          stop: "Asked Postgres for the password in .env",
          task: databaseCheck,
        }),
    )
    .otherwise(async () => null);

  if (database) {
    results.push(database);
    ui.check(database);
  }

  const port =
    match(existsSync(".env"))
      .with(true, () => readEnvValue(".env", "PORT"))
      .otherwise(() => null) ?? "4321";

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

  const failed = A.filter(results, (result) => !result.ok).length;

  if (failed === 0) {
    ui.note(
      nextSteps({
        appUrl: readEnvValue(".env", "APP_URL") ?? DEFAULT_APP_URL,
        mailKeySet: mailKeyIsSet(),
      }),
    );
    ui.outro("All checks passed.");
    return 0;
  }

  const repairable = A.getBy(results, (result) => !result.ok && result.repair === "reset-database");

  if (repairable && ui.isRich()) {
    ui.info(
      "doctor can delete the database volume and start again, so Postgres takes the password in .env.",
    );

    if (await confirmReset()) return resetAndStart();
  }

  ui.outroError(
    match(failed)
      .with(1, () => "1 check failed.")
      .otherwise((failed) => `${failed} checks failed.`),
  );

  return 1;
}
