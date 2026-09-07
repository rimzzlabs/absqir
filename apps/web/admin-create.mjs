// One-off container script: create an account through the normal sign-up
// path, so hashing, validation, and the personal organization all apply.
// The CLI runs it with REGISTRATION_OPEN=true for this container only.
import { parseArgs } from "node:util";
import { createRequestContext } from "@absqir/api";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    password: { type: "string" },
  },
});

if (!values.email || !values.name || !values.password) {
  console.error("Usage: node admin-create.mjs --email <email> --name <name> --password <pw>");
  process.exit(1);
}

const bindings = {
  HYPERDRIVE: { connectionString: process.env.DATABASE_URL },
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  ENVIRONMENT: process.env.ENVIRONMENT ?? "production",
  REGISTRATION_OPEN: process.env.REGISTRATION_OPEN,
  SECURE_COOKIES: process.env.SECURE_COOKIES,
};

const { auth, close } = createRequestContext(bindings, "http://localhost");

try {
  await auth.api.signUpEmail({
    body: { email: values.email, name: values.name, password: values.password },
  });
  console.log(`Created account ${values.email}`);
} catch (error) {
  console.error(`Could not create the account: ${error?.body?.message ?? error?.message ?? error}`);
  process.exitCode = 1;
} finally {
  await close();
}
