#!/usr/bin/env node
import { createRequire } from "node:module";
import { adminCreate, memberAdd } from "@/commands/admin";
import { configGet, configSet } from "@/commands/config";
import { doctor } from "@/commands/doctor";
import { init } from "@/commands/init";
import { down, logs, migrate, up, upgrade } from "@/commands/lifecycle";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const HELP = `absqir ${version} — self-host the QR attendance system

Usage: absqir <command>

  init [dir]        write docker-compose.yml and .env with fresh secrets
  up                start the stack (docker compose up -d)
  down              stop the stack
  logs              follow the app logs
  upgrade           pull the configured image tag and restart the app
  migrate           apply database migrations in a one-off container
  admin create      create an account: --email --name [--password]
  member add        add a user to an organization: --email --org [--role]
  config set K V    change a setting in .env
  config get [K]    print the settings
  doctor            check docker, files, secrets, and the health endpoint

Run every command from the instance directory (where .env lives).`;

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
      console.log(version);
      return 0;
    case undefined:
    case "--help":
    case "-h":
      console.log(HELP);
      return command === undefined ? 1 : 0;
    default:
      break;
  }

  console.error(`Unknown command: ${argv.join(" ")}`);
  console.error("Run `absqir --help` for the command list.");
  return 1;
}

const code = await dispatch(process.argv.slice(2));
process.exit(code);
