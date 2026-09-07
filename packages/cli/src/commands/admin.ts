import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { runCompose } from "@/lib/compose";

export async function adminCreate(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      email: { type: "string" },
      name: { type: "string" },
      password: { type: "string" },
    },
  });

  if (!values.email || !values.name) {
    console.error("Usage: absqir admin create --email <email> --name <name> [--password <pw>]");
    return 1;
  }

  const password = values.password ?? randomBytes(12).toString("base64url");

  // REGISTRATION_OPEN=true only inside this one-off container, so the closed
  // instance stays closed while the operator adds an account.
  const code = await runCompose({
    args: [
      "run",
      "--rm",
      "-e",
      "REGISTRATION_OPEN=true",
      "app",
      "node",
      "admin-create.mjs",
      "--email",
      values.email,
      "--name",
      values.name,
      "--password",
      password,
    ],
  });

  if (code === 0 && !values.password) {
    console.log("");
    console.log(`Generated password for ${values.email}: ${password}`);
    console.log("Share it over a safe channel. The user can change it after sign-in.");
  }

  return code;
}

export async function memberAdd(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      email: { type: "string" },
      org: { type: "string" },
      role: { type: "string", default: "member" },
    },
  });

  if (!values.email || !values.org) {
    console.error("Usage: absqir member add --email <email> --org <slug> [--role member|admin]");
    return 1;
  }

  return runCompose({
    args: [
      "run",
      "--rm",
      "app",
      "node",
      "member-add.mjs",
      "--email",
      values.email,
      "--org",
      values.org,
      "--role",
      values.role,
    ],
  });
}
