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
      "create-orgs": { type: "boolean", default: false },
    },
  });

  if (!values.email || !values.name) {
    console.error(
      "Usage: absqir admin create --email <email> --name <name> [--password <pw>] [--create-orgs]",
    );
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
      "scripts/admin-create.mjs",
      "--email",
      values.email,
      "--name",
      values.name,
      "--password",
      password,
      ...(values["create-orgs"] ? ["--create-orgs"] : []),
    ],
  });

  if (code === 0 && !values.password) {
    console.log("");
    console.log(`Generated password for ${values.email}: ${password}`);
    console.log("Share it over a safe channel. The user can change it after sign-in.");
  }

  return code;
}

export async function adminPromote(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      email: { type: "string" },
      revoke: { type: "boolean", default: false },
    },
  });

  if (!values.email) {
    console.error("Usage: absqir admin promote --email <email> [--revoke]");
    return 1;
  }

  return runCompose({
    args: [
      "run",
      "--rm",
      "app",
      "node",
      "scripts/admin-promote.mjs",
      "--email",
      values.email,
      ...(values.revoke ? ["--revoke"] : []),
    ],
  });
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

  const roles = ["owner", "admin", "organizer", "member"];

  if (!values.email || !values.org || !roles.includes(values.role)) {
    console.error(
      "Usage: absqir member add --email <email> --org <slug> [--role owner|admin|organizer|member]",
    );
    return 1;
  }

  return runCompose({
    args: [
      "run",
      "--rm",
      "app",
      "node",
      "scripts/member-add.mjs",
      "--email",
      values.email,
      "--org",
      values.org,
      "--role",
      values.role,
    ],
  });
}
