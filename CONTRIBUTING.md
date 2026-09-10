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

## Data work goes through ts-belt

`@mobily/ts-belt` is the tool for transforming, grouping or folding a
collection, in every workspace. Call it data-first, and reach for `pipe` as
soon as there are two steps:

```ts
const ids = pipe(
  rows,
  A.filter((row) => row.role !== "member"),
  A.map((row) => row.userId),
);
```

Three things differ from the native methods, and the type checker will not
always tell you which one bit you:

- `A.reduce(xs, seed, fn)` takes the seed **second**, not last.
- `A.map` passes only the value. Use `A.mapWithIndex(xs, (index, value) => …)`,
  whose index comes **first**.
- `A.find` is `A.getBy`, and it returns `Option<T>`, so `None` is
  `undefined | null`, not just `undefined`.

A predicate must return a real boolean. `A.filter(rows, (row) => row.name)`
does not compile, which is the point: write `row.name !== null`.

`packages/config/belt.d.ts` sets `Belt.UseMutableArrays = 1`. That is a
types-only switch, and it exists because Drizzle's `.values()` and most of our
own row types want a mutable array, while ts-belt always builds a fresh array
at run time anyway. The cost is that a `readonly` input, such as an `as const`
list, needs a spread: `A.map([...PROVIDERS], …)`. `apps/web` carries its own
copy of that file because it does not extend the shared tsconfig.

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
