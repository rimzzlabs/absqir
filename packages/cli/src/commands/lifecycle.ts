import { existsSync } from "node:fs";
import { runCompose, streamCompose } from "#src/lib/compose";
import { readEnvValue } from "#src/lib/env-file";
import { nextSteps } from "#src/lib/next-steps";
import { DEFAULT_APP_URL } from "#src/lib/templates";
import * as ui from "#src/ui";

interface StackStepParams {
  title: string;
  done: string;
  args: string[];
}

/**
 * Compose keeps stdout and stderr, so it prints its own progress. A spinner
 * here would draw over that output. The frame is an intro and an outro only.
 */
async function stackStep(params: StackStepParams): Promise<number> {
  ui.intro(params.title);

  const code = await runCompose({ args: params.args });

  if (code === 0) ui.outro(params.done);
  else ui.outroError(`docker compose stopped with code ${code}.`);

  return code;
}

const HEALTH_TIMEOUT_MS = 120_000;
const HEALTH_POLL_MS = 2_000;
/** The entrypoint prints this when a fault will not heal, such as a wrong password. */
const STOPPED_MARK = "migrations: stopped. ";

function envValue(key: string): string | null {
  return existsSync(".env") ? readEnvValue(".env", key) : null;
}

async function healthy(port: string): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/api/health`, {
      signal: AbortSignal.timeout(HEALTH_POLL_MS),
    });

    return response.ok;
  } catch {
    return false;
  }
}

type WaitOutcome = { kind: "up" } | { kind: "stopped"; reason: string } | { kind: "silent" };

/**
 * Follows the app log while the health endpoint is polled, the way a plain
 * `docker compose up` shows a start. The log tells the operator what the app
 * is doing, and a fault the entrypoint gave up on ends the wait at once.
 */
async function followUntilUp(port: string): Promise<WaitOutcome> {
  let stopped: string | null = null;

  const stream = streamCompose({
    // The container started a moment ago, so its whole log is inside this window.
    args: ["logs", "--follow", "--no-log-prefix", "--since", "60s", "app"],
    onLine: (line) => {
      const at = line.indexOf(STOPPED_MARK);
      if (at !== -1 && !stopped) stopped = line.slice(at + STOPPED_MARK.length);
    },
  });

  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let outcome: WaitOutcome = { kind: "silent" };

  while (Date.now() < deadline) {
    if (stopped) {
      outcome = { kind: "stopped", reason: stopped };
      break;
    }

    if (await healthy(port)) {
      outcome = { kind: "up" };
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_MS));
  }

  stream.stop();
  await stream.done;

  return outcome;
}

export async function up(): Promise<number> {
  ui.intro("absqir up");

  const code = await runCompose({ args: ["up", "-d"] });

  if (code !== 0) {
    ui.outroError(`docker compose stopped with code ${code}.`);
    return code;
  }

  const port = envValue("PORT") ?? "4321";

  ui.info("The app log follows until the app answers.");

  const outcome = await followUntilUp(port);

  if (outcome.kind === "stopped") {
    ui.fail(outcome.reason);
    ui.outroError("The app stopped. Fix the cause above, then run `absqir up` again.");
    return 1;
  }

  if (outcome.kind === "silent") {
    ui.outroError(
      "The app has not answered in two minutes. The log above says why. `absqir logs` keeps following it.",
    );
    return 1;
  }

  ui.success(`The app answers on http://localhost:${port}`);
  ui.note(
    nextSteps({
      appUrl: envValue("APP_URL") ?? DEFAULT_APP_URL,
      mailKeySet: (envValue("RESEND_API_KEY") ?? "").length > 0,
    }),
  );
  ui.outro("The stack is running.");

  return 0;
}

export function down(): Promise<number> {
  return stackStep({ title: "absqir down", done: "The stack is stopped.", args: ["down"] });
}

export function logs(): Promise<number> {
  ui.info("Following the app logs. Press Ctrl+C to stop.");

  return runCompose({ args: ["logs", "-f", "app"] });
}

/** Pulls the configured tag again, then recreates the app container. */
export async function upgrade(): Promise<number> {
  ui.intro("absqir upgrade");

  const pulled = await runCompose({ args: ["pull", "app"] });

  if (pulled !== 0) {
    ui.outroError(`docker compose pull stopped with code ${pulled}.`);
    return pulled;
  }

  const code = await runCompose({ args: ["up", "-d", "app"] });

  if (code === 0) ui.outro("The app runs the new image. Read `absqir logs` to watch it start.");
  else ui.outroError(`docker compose stopped with code ${code}.`);

  return code;
}

/** One-off container that applies migrations and exits. */
export function migrate(): Promise<number> {
  return stackStep({
    title: "absqir migrate",
    done: "Migrations are applied.",
    args: ["run", "--rm", "app", "node", "docker-entry.mjs", "--migrate-only"],
  });
}
