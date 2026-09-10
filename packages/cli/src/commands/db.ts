import { parseArgs } from "node:util";
import { up } from "#src/commands/lifecycle";
import { runCompose } from "#src/lib/compose";
import { UsageError } from "#src/lib/errors";
import * as ui from "#src/ui";

/**
 * Deletes the database volume and starts the stack again. The way out when
 * the volume holds a password that .env no longer has, or when a try went
 * wrong and a clean database is worth more than its rows.
 */
export async function dbReset(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: { yes: { type: "boolean", default: false } },
  });

  ui.intro("absqir db reset");

  const agreed = values.yes || (await confirmReset());

  if (!agreed) {
    ui.outro("Nothing was deleted.");
    return 1;
  }

  return resetAndStart();
}

/** Asks on a terminal. Outside one the caller must pass --yes. */
export async function confirmReset(): Promise<boolean> {
  if (!ui.isRich()) {
    throw new UsageError("This deletes the database. Pass --yes to confirm it without a prompt.");
  }

  ui.warn("This deletes every row in the database: accounts, events, and check-ins.");

  return ui.confirm({
    message: "Delete the database volume and start the stack again?",
    flag: "--yes",
    initialValue: false,
  });
}

/** Stops the stack, drops its volumes, and runs the normal start. */
export async function resetAndStart(): Promise<number> {
  const code = await runCompose({ args: ["down", "-v"] });

  if (code !== 0) {
    ui.outroError(`docker compose stopped with code ${code}. The volume is still there.`);
    return code;
  }

  ui.success("The database volume is gone. Postgres creates a new one with the password in .env.");

  return up();
}
