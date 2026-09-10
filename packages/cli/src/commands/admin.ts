import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { usageOf } from "#src/lib/commands";
import { runCompose } from "#src/lib/compose";
import { readEnvValue } from "#src/lib/env-file";
import { UsageError } from "#src/lib/errors";
import { DEFAULT_APP_URL } from "#src/lib/templates";
import * as ui from "#src/ui";

const ROLES = ["owner", "admin", "organizer", "member"] as const;

type Role = (typeof ROLES)[number];

function validateEmail(value: string | undefined): string | undefined {
  if (!value || !/^\S+@\S+\.\S+$/.test(value)) return "Enter an email address";

  return undefined;
}

function validateFilled(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) return "This one cannot stay empty";

  return undefined;
}

export async function adminCreate(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      email: { type: "string" },
      name: { type: "string" },
      password: { type: "string" },
      "create-orgs": { type: "boolean" },
    },
  });

  ui.intro("absqir admin create");

  const email =
    values.email ??
    (await ui.text({
      message: "Email address",
      flag: `--email. ${usageOf("admin create")}`,
      validate: validateEmail,
    }));

  const name =
    values.name ??
    (await ui.text({
      message: "Full name",
      flag: `--name. ${usageOf("admin create")}`,
      validate: validateFilled,
    }));

  const typed =
    values.password ??
    (ui.isRich()
      ? await ui.password({
          message: "Password (leave it empty to generate one)",
          flag: "--password",
        })
      : "");

  const password = typed || randomBytes(12).toString("base64url");

  const createOrgs =
    values["create-orgs"] ??
    (ui.isRich()
      ? await ui.confirm({
          message: "Let this account create organizations?",
          flag: "--create-orgs",
          initialValue: true,
        })
      : false);

  ui.info(`Creating ${email} in a one-off container.`);

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
      email,
      "--name",
      name,
      "--password",
      password,
      ...(createOrgs ? ["--create-orgs"] : []),
    ],
  });

  if (code !== 0) {
    ui.outroError(`The account was not created. docker compose stopped with code ${code}.`);
    return code;
  }

  if (!typed) {
    ui.note({
      title: `Password for ${email}`,
      lines: [password, "", "Send it over a safe channel. The user can change it after sign-in."],
    });
  }

  const appUrl = (existsSync(".env") ? readEnvValue(".env", "APP_URL") : null) ?? DEFAULT_APP_URL;

  ui.outro(`Open ${appUrl} and sign in as ${email} with the password.`);

  return 0;
}

export async function adminPromote(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      email: { type: "string" },
      revoke: { type: "boolean", default: false },
    },
  });

  ui.intro("absqir admin promote");

  const email =
    values.email ??
    (await ui.text({
      message: "Email address",
      flag: `--email. ${usageOf("admin promote")}`,
      validate: validateEmail,
    }));

  const code = await runCompose({
    args: [
      "run",
      "--rm",
      "app",
      "node",
      "scripts/admin-promote.mjs",
      "--email",
      email,
      ...(values.revoke ? ["--revoke"] : []),
    ],
  });

  if (code === 0) {
    ui.outro(
      values.revoke
        ? `${email} can no longer create organizations.`
        : `${email} can create organizations.`,
    );
  } else {
    ui.outroError(`docker compose stopped with code ${code}.`);
  }

  return code;
}

export async function memberAdd(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      email: { type: "string" },
      org: { type: "string" },
      role: { type: "string" },
    },
  });

  if (values.role && !ROLES.includes(values.role as Role)) {
    throw new UsageError(`Unknown role ${values.role}. ${usageOf("member add")}`);
  }

  ui.intro("absqir member add");

  const email =
    values.email ??
    (await ui.text({
      message: "Email address of the account",
      flag: `--email. ${usageOf("member add")}`,
      validate: validateEmail,
    }));

  const org =
    values.org ??
    (await ui.text({
      message: "Organization slug",
      flag: `--org. ${usageOf("member add")}`,
      validate: validateFilled,
    }));

  const role =
    (values.role as Role | undefined) ??
    (ui.isRich()
      ? await ui.select<Role>({
          message: "Role in the organization",
          flag: "--role",
          initialValue: "member",
          options: [
            { value: "owner", label: "owner", hint: "everything, including deletion" },
            { value: "admin", label: "admin", hint: "members, events, settings" },
            { value: "organizer", label: "organizer", hint: "events and attendance" },
            { value: "member", label: "member", hint: "attends events" },
          ],
        })
      : "member");

  const code = await runCompose({
    args: [
      "run",
      "--rm",
      "app",
      "node",
      "scripts/member-add.mjs",
      "--email",
      email,
      "--org",
      org,
      "--role",
      role,
    ],
  });

  if (code === 0) ui.outro(`${email} joined ${org} as ${role}.`);
  else ui.outroError(`docker compose stopped with code ${code}.`);

  return code;
}
