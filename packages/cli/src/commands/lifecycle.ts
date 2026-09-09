import { runCompose } from "@/lib/compose";
import * as ui from "@/ui";

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

export function up(): Promise<number> {
  return stackStep({
    title: "absqir up",
    done: "The stack is running. Check it with `absqir doctor`.",
    args: ["up", "-d"],
  });
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
