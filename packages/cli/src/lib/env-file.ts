import { readFileSync, writeFileSync } from "node:fs";

/**
 * Minimal .env editing: one KEY="value" per line, comments preserved. This is
 * for the file `absqir init` writes, not for arbitrary dotenv dialects.
 */
export function readEnvValue(path: string, key: string): string | null {
  const content = readFileSync(path, "utf8");
  const line = content.split("\n").find((row) => row.startsWith(`${key}=`));

  if (!line) return null;

  return line.slice(key.length + 1).replaceAll('"', "");
}

export interface SetEnvValueParams {
  path: string;
  key: string;
  value: string;
}

export function setEnvValue(params: SetEnvValueParams): void {
  const { path, key, value } = params;
  const content = readFileSync(path, "utf8");
  const lines = content.split("\n");
  const index = lines.findIndex((row) => row.startsWith(`${key}=`));
  const next = `${key}="${value}"`;

  if (index === -1) {
    const trailing = lines.at(-1) === "" ? lines.slice(0, -1) : lines;
    writeFileSync(path, `${[...trailing, next].join("\n")}\n`);
    return;
  }

  writeFileSync(path, lines.toSpliced(index, 1, next).join("\n"));
}
