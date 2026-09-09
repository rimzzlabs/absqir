import { type CommandId, commandInfo } from "@/lib/commands";
import * as ui from "@/ui";

type TopChoice =
  | "init"
  | "up"
  | "down"
  | "logs"
  | "upgrade"
  | "migrate"
  | "accounts"
  | "config"
  | "doctor"
  | "quit";

function choiceOf<Id extends CommandId>(id: Id): ui.Choice<Id> {
  return { value: id, label: id, hint: commandInfo(id).hint };
}

/**
 * The menu behind a bare `absqir`. It picks a command and hands the argv back,
 * so each command still asks for its own values and draws its own frame.
 */
export async function menu(): Promise<string[] | null> {
  const picked = await ui.select<TopChoice>({
    message: "What do you want to do?",
    flag: "a command",
    options: [
      choiceOf("init"),
      choiceOf("up"),
      choiceOf("down"),
      choiceOf("logs"),
      choiceOf("upgrade"),
      choiceOf("migrate"),
      { value: "accounts", label: "accounts", hint: "create, promote, add to an organization" },
      { value: "config", label: "config", hint: "read or change .env" },
      choiceOf("doctor"),
      { value: "quit", label: "quit", hint: "leave without running anything" },
    ],
  });

  if (picked === "quit") {
    ui.info("Nothing ran.");
    return null;
  }

  if (picked === "accounts") {
    const action = await ui.select<"admin create" | "admin promote" | "member add">({
      message: "Which one?",
      flag: "a command",
      options: [choiceOf("admin create"), choiceOf("admin promote"), choiceOf("member add")],
    });

    return action.split(" ");
  }

  if (picked === "config") {
    const action = await ui.select<"config set" | "config get">({
      message: "Which one?",
      flag: "a command",
      options: [choiceOf("config set"), choiceOf("config get")],
    });

    return action.split(" ");
  }

  return [picked];
}
