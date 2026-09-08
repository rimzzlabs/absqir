// One-off container script: add an existing user to an organization by slug.
import { parseArgs } from "node:util";
import { addMember } from "@absqir/db/ops";

const ROLES = ["owner", "admin", "organizer", "member"];

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    org: { type: "string" },
    role: { type: "string", default: "member" },
  },
});

if (!values.email || !values.org || !ROLES.includes(values.role)) {
  console.error(
    "Usage: node scripts/member-add.mjs --email <email> --org <slug> [--role owner|admin|organizer|member]",
  );
  process.exit(1);
}

const result = await addMember({
  connectionString: process.env.DATABASE_URL,
  email: values.email,
  organizationSlug: values.org,
  role: values.role,
});

if (result.ok) {
  console.log(`Added ${values.email} to ${values.org} as ${values.role}`);
} else {
  const messages = {
    "user-not-found": `No account with email ${values.email}. Create it first: absqir admin create`,
    "organization-not-found": `No organization with slug ${values.org}.`,
    "already-member": `${values.email} is already a member of ${values.org}.`,
  };
  console.error(messages[result.reason]);
  process.exit(1);
}
