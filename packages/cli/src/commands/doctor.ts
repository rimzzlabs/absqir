import { existsSync } from "node:fs";
import { dockerAvailable } from "@/lib/compose";
import { readEnvValue } from "@/lib/env-file";
import { callbackUrl, keysOf, PROVIDERS } from "@/lib/providers";

const MIN_SECRET_LENGTH = 32;

interface CheckResult {
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

export async function doctor(): Promise<number> {
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

  if (hasEnv) {
    const secret = readEnvValue(".env", "BETTER_AUTH_SECRET") ?? "";
    results.push({
      label: `BETTER_AUTH_SECRET has ${MIN_SECRET_LENGTH}+ characters`,
      ok: secret.length >= MIN_SECRET_LENGTH,
      hint: "Generate one: openssl rand -base64 32",
    });
  }

  if (hasEnv) {
    const mailKey = readEnvValue(".env", "RESEND_API_KEY") ?? "";
    results.push({
      label: "RESEND_API_KEY is set",
      ok: mailKey.length > 0,
      hint: "Sign-in codes travel by email. Set it: absqir config set RESEND_API_KEY re_...",
    });
  }

  if (hasEnv) {
    const appUrl = readEnvValue(".env", "APP_URL") ?? "";

    for (const provider of PROVIDERS) {
      const [idKey, secretKey] = keysOf(provider.id);
      const id = readEnvValue(".env", idKey) ?? "";
      const secret = readEnvValue(".env", secretKey) ?? "";

      if (!id && !secret) continue;

      results.push({
        label: `${provider.label} sign-in has both keys`,
        ok: Boolean(id) && Boolean(secret),
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
  }

  const port = (hasEnv ? readEnvValue(".env", "PORT") : null) ?? "4321";
  results.push({
    label: `the app answers on http://localhost:${port}/api/health`,
    ok: await healthCheck(port),
    hint: "Start it with `absqir up`, then read `absqir logs`.",
  });

  let failed = 0;

  for (const result of results) {
    console.log(`${result.ok ? "ok  " : "FAIL"}  ${result.label}`);

    if (!result.ok) {
      failed += 1;
      if (result.hint) console.log(`      ${result.hint}`);
    }
  }

  console.log("");
  console.log(failed === 0 ? "All checks passed." : `${failed} check(s) failed.`);

  return failed === 0 ? 0 : 1;
}
