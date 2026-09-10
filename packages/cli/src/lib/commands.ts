import { A } from "@mobily/ts-belt";
export interface CommandInfo {
  id: string;
  usage: string;
  hint: string;
}

/**
 * One list behind the help text, the menu, and every usage error. A command
 * that lives in two lists will drift out of step with itself.
 */
export const COMMANDS = [
  {
    id: "init",
    usage:
      "absqir init [dir] [--force] [--yes] [--app-url <url>] [--resend-key <key>] [--provider <id>]",
    hint: "write docker-compose.yml and .env with fresh secrets",
  },
  { id: "up", usage: "absqir up", hint: "start the stack" },
  { id: "down", usage: "absqir down", hint: "stop the stack" },
  { id: "logs", usage: "absqir logs", hint: "follow the app logs" },
  { id: "upgrade", usage: "absqir upgrade", hint: "pull the configured tag and restart the app" },
  {
    id: "migrate",
    usage: "absqir migrate",
    hint: "apply database migrations in a one-off container",
  },
  {
    id: "admin create",
    usage: "absqir admin create --email <email> --name <name> [--password <pw>] [--create-orgs]",
    hint: "create an account",
  },
  {
    id: "admin promote",
    usage: "absqir admin promote --email <email> [--revoke]",
    hint: "let an account create organizations",
  },
  {
    id: "member add",
    usage: "absqir member add --email <email> --org <slug> [--role owner|admin|organizer|member]",
    hint: "add a user to an organization",
  },
  { id: "config set", usage: "absqir config set <KEY> <value>", hint: "change a setting in .env" },
  { id: "config get", usage: "absqir config get [KEY] [--reveal]", hint: "print the settings" },
  {
    id: "doctor",
    usage: "absqir doctor",
    hint: "check docker, files, secrets, and the health endpoint",
  },
] as const satisfies readonly CommandInfo[];

export type CommandId = (typeof COMMANDS)[number]["id"];

export function commandInfo(id: CommandId): CommandInfo {
  const found = A.getBy(COMMANDS, (command) => command.id === id);

  if (!found) throw new Error(`No such command: ${id}`);

  return found;
}

export function usageOf(id: CommandId): string {
  return `Usage: ${commandInfo(id).usage}`;
}
