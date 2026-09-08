// One-off container script: create an account through the normal sign-up
// path, so hashing and validation apply. The CLI runs it with
// REGISTRATION_OPEN=true for this container only. The account skips onboarding
// and, with --create-orgs, may create organizations.
import { parseArgs } from "node:util";
import { createRequestContext } from "@absqir/api";
import { markUser } from "@absqir/db/ops";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    password: { type: "string" },
    "create-orgs": { type: "boolean", default: false },
  },
});

if (!values.email || !values.name || !values.password) {
  console.error(
    "Usage: node scripts/admin-create.mjs --email <email> --name <name> --password <pw> [--create-orgs]",
  );
  process.exit(1);
}

const bindings = {
  HYPERDRIVE: { connectionString: process.env.DATABASE_URL },
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  ENVIRONMENT: process.env.ENVIRONMENT ?? "production",
  REGISTRATION_OPEN: process.env.REGISTRATION_OPEN,
  SECURE_COOKIES: process.env.SECURE_COOKIES,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
};

const { auth, close } = createRequestContext(bindings, "http://localhost");

try {
  await auth.api.signUpEmail({
    body: { email: values.email, name: values.name, password: values.password },
  });

  const marked = await markUser({
    connectionString: process.env.DATABASE_URL,
    email: values.email,
    onboardingStep: "done",
    canCreateOrganizations: values["create-orgs"],
  });

  if (!marked.ok) throw new Error("The account was created but could not be marked as ready.");

  console.log(`Created account ${values.email}`);
} catch (error) {
  console.error(`Could not create the account: ${error?.body?.message ?? error?.message ?? error}`);
  process.exitCode = 1;
} finally {
  await close();
}
