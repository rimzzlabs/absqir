// pnpm hook. Some packages list frameworks and tools as optional peers. absqir
// does not use them, but pnpm still links one when another workspace package
// has it, and it then rides into the production image. Drop those peer edges
// before resolution, so the lockfile never carries them.
const unusedPeers = {
  "better-auth": [
    "next",
    "drizzle-kit",
    "vitest",
    "vue",
    "svelte",
    "solid-js",
    "prisma",
    "@prisma/client",
    "mongodb",
    "mysql2",
    "better-sqlite3",
    "@sveltejs/kit",
    "@tanstack/react-start",
    "@tanstack/solid-start",
    "@lynx-js/react",
  ],
  nuqs: ["next", "react-router"],
  "@t3-oss/env-core": ["typescript"],
};

function readPackage(pkg) {
  const peers = unusedPeers[pkg.name];
  if (!peers) return pkg;
  for (const name of peers) {
    delete pkg.peerDependencies?.[name];
    delete pkg.peerDependenciesMeta?.[name];
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
