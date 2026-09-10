# Contributing

Thanks for helping with absqir. This page tells you how to set up, what the
checks expect, and how a change lands.

## Set up

Follow the "Develop" section in [README.md](README.md). You need Node 22+,
pnpm, and a local Postgres. `pnpm dev` starts the site and the API on one
origin.

## How dev resolves the packages

Each `packages/*` workspace declares two entry points:

```json
"exports": { ".": { "development": "./src/index.ts", "default": "./dist/index.js" } }
```

Vite picks `development` and reads the TypeScript source, so an edit in a
package hot-reloads at once. `astro build` picks `default` and gets the
`tsdown` output. Add both conditions when you add an export.

TypeScript still reads the built `.d.ts` files. Do not add
`customConditions` to `apps/web/tsconfig.json`: inferring the Hono `AppType`
from `packages/api/src` exceeds the inference limit and drops the types on
every RPC call. Run `pnpm dev:all` to keep those `.d.ts` files fresh.

Inside a package, import your own modules with the `#src/` prefix:

```ts
import { userTable } from "#src/schema";
```

The prefix comes from the `imports` field in that package's `package.json`,
so it means the same thing to Vite, tsdown, Vitest, and TypeScript. Do not
use a `paths` alias: another package that reads this source cannot resolve
it.

## Before you push

Run the same checks CI runs:

```bash
pnpm check        # Biome lint and format
pnpm format:check # Prettier for Markdown and YAML
pnpm typecheck
pnpm test
pnpm build        # Cloudflare target
pnpm build:node   # Node target
```

A change must build on both targets. Platform access goes through the
runtime interface in `apps/web/src/lib/runtime/` — do not import
`cloudflare:workers` or read `process.env` anywhere else in the web app.

## Commits

Commits follow Conventional Commits. `pnpm commit` walks you through the
format. The scope is one of: `web`, `api`, `auth`, `db`, `ui`, `core`,
`cli`, `docs`, `email`, `ci`, `deps`, `repo`.

## Pull requests

- Keep one change per pull request.
- The repo squash-merges: the PR title becomes the commit title, so write
  it as a conventional commit message.
- A change in behavior updates the docs in `apps/docs` in the same PR.
- New API routes get zod-openapi definitions, so the API reference stays
  complete.

## Releases

Maintainers merge the release-please pull request. That tags a version,
publishes the Docker image to GHCR, and publishes the CLI to npm. You never
need to bump a version by hand.
