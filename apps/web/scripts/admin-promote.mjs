// One-off container script: let an existing account create organizations.
import { parseArgs } from "node:util";
import { markUser } from "@absqir/db/ops";
import { match } from "ts-pattern";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    revoke: { type: "boolean", default: false },
  },
});

if (!values.email) {
  console.error("Usage: node scripts/admin-promote.mjs --email <email> [--revoke]");
  process.exit(1);
}

const result = await markUser({
  connectionString: process.env.DATABASE_URL,
  email: values.email,
  canCreateOrganizations: !values.revoke,
});

if (result.ok) {
  console.log(
    match(values.revoke)
      .with(true, () => `${values.email} can no longer create organizations`)
      .otherwise(() => `${values.email} can now create organizations`),
  );
} else {
  console.error(`No account with email ${values.email}.`);
  process.exit(1);
}
