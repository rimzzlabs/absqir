import { runCompose } from "@/lib/compose";

export function up(): Promise<number> {
  return runCompose({ args: ["up", "-d"] });
}

export function down(): Promise<number> {
  return runCompose({ args: ["down"] });
}

export function logs(): Promise<number> {
  return runCompose({ args: ["logs", "-f", "app"] });
}

/** Pulls the configured tag again, then recreates the app container. */
export async function upgrade(): Promise<number> {
  const pulled = await runCompose({ args: ["pull", "app"] });
  if (pulled !== 0) return pulled;

  return runCompose({ args: ["up", "-d", "app"] });
}

/** One-off container that applies migrations and exits. */
export function migrate(): Promise<number> {
  return runCompose({
    args: ["run", "--rm", "app", "node", "docker-entry.mjs", "--migrate-only"],
  });
}
