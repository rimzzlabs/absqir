import { spawn } from "node:child_process";

export interface RunComposeOptions {
  args: string[];
  cwd?: string;
}

/**
 * Runs `docker compose` with inherited stdio, so the operator sees the same
 * output compose prints. Resolves with the exit code instead of throwing:
 * a non-zero compose exit is an outcome to report, not a crash.
 */
export function runCompose(options: RunComposeOptions): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", ...options.args], {
      cwd: options.cwd ?? process.cwd(),
      stdio: "inherit",
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => resolve(code ?? 1));
  });
}

export function dockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("docker", ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}
