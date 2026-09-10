#!/usr/bin/env node
import { createRequire } from "node:module";
import { adminCreate, adminPromote, memberAdd } from "#src/commands/admin";
import { configGet, configSet } from "#src/commands/config";
import { doctor } from "#src/commands/doctor";
import { init } from "#src/commands/init";
import { down, logs, migrate, up, upgrade } from "#src/commands/lifecycle";
import { COMMANDS } from "#src/lib/commands";
import { CancelError, UsageError } from "#src/lib/errors";
import { menu } from "#src/menu";
import * as ui from "#src/ui";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

function helpText(): string {
  const width = Math.max(...COMMANDS.map((command) => command.id.length));
  const lines = COMMANDS.map((command) => `  ${command.id.padEnd(width)}  ${command.hint}`);

  return [
    `absqir ${version} — self-host the QR attendance system`,
    "",
    "Usage: absqir <command>",
    "       absqir            open the menu",
    "",
    ...lines,
    "",
    "Run every command from the instance directory (where .env lives).",
  ].join("\n");
}

async function dispatch(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  switch (command) {
    case "init":
      return init(rest);
    case "up":
      return up();
    case "down":
      return down();
    case "logs":
      return logs();
    case "upgrade":
      return upgrade();
    case "migrate":
      return migrate();
    case "admin":
      if (rest[0] === "create") return adminCreate(rest.slice(1));
      if (rest[0] === "promote") return adminPromote(rest.slice(1));
      break;
    case "member":
      if (rest[0] === "add") return memberAdd(rest.slice(1));
      break;
    case "config":
      if (rest[0] === "set") return configSet(rest.slice(1));
      if (rest[0] === "get") return configGet(rest.slice(1));
      break;
    case "doctor":
      return doctor();
    case "--version":
    case "-v":
      ui.raw(version);
      return 0;
    case "--help":
    case "-h":
      ui.raw(helpText());
      return 0;
    default:
      break;
  }

  throw new UsageError(
    `Unknown command: ${argv.join(" ")}\nRun \`absqir --help\` for the command list.`,
  );
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);

  if (argv.length > 0) return dispatch(argv);

  if (!ui.isRich()) {
    ui.raw(helpText());
    return 1;
  }

  const picked = await menu();

  if (!picked) return 0;

  return dispatch(picked);
}

function isParseArgsError(error: unknown): boolean {
  return (
    error instanceof Error &&
    String((error as NodeJS.ErrnoException).code).startsWith("ERR_PARSE_ARGS")
  );
}

try {
  process.exit(await main());
} catch (error) {
  if (error instanceof CancelError) {
    ui.cancelled();
    process.exit(130);
  }

  if (error instanceof UsageError || isParseArgsError(error)) {
    ui.outroError((error as Error).message);
    process.exit(1);
  }

  throw error;
}
