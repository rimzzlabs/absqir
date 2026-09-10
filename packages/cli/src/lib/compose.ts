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

export interface ComposeStream {
  /** Resolves when the stream ends, by itself or through stop(). */
  done: Promise<void>;
  stop: () => void;
}

export interface StreamComposeOptions extends RunComposeOptions {
  /** Called once per line, after the line is shown. */
  onLine: (line: string) => void;
}

/**
 * Runs `docker compose` and shows its output line by line, while a reader
 * watches each line. `up` follows the app log this way until the app answers,
 * or until the entrypoint reports a fault it will not recover from.
 */
export function streamCompose(options: StreamComposeOptions): ComposeStream {
  const child = spawn("docker", ["compose", ...options.args], {
    cwd: options.cwd ?? process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let rest = "";

  const read = (chunk: Buffer) => {
    process.stdout.write(chunk);
    rest += chunk.toString("utf8");
    const lines = rest.split("\n");
    rest = lines.pop() ?? "";
    for (const line of lines) options.onLine(line);
  };

  child.stdout.on("data", read);
  child.stderr.on("data", read);

  const done = new Promise<void>((resolve) => {
    child.on("error", () => resolve());
    child.on("close", () => resolve());
  });

  return { done, stop: () => child.kill() };
}

export interface CaptureComposeResult {
  code: number;
  output: string;
}

/**
 * Runs `docker compose` and keeps its output instead of showing it, for the
 * checks that read an answer (doctor asking Postgres for a password).
 */
export function captureCompose(options: RunComposeOptions): Promise<CaptureComposeResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", ...options.args], {
      cwd: options.cwd ?? process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("error", (error) => reject(error));
    child.on("close", (code) =>
      resolve({ code: code ?? 1, output: Buffer.concat(chunks).toString("utf8") }),
    );
  });
}

export function dockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("docker", ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}
