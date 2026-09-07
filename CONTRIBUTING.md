# Contributing

Thanks for helping with absqir. This page tells you how to set up, what the
checks expect, and how a change lands.

## Set up

Follow the "Develop" section in [README.md](README.md). You need Node 22+,
pnpm, and a local Postgres. `pnpm dev:all` starts the site, the API watcher,
and the email preview on one origin.

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
