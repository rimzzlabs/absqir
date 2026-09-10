<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/logo-dark.svg">
  <img alt="absqir" src="assets/brand/logo-light.svg" width="240">
</picture>

# absqir

Open-source attendance for offices and communities. An organization keeps a
directory of people and groups them into teams or cohorts. An event
expects a group, or anyone who registered on its public page: the room
shows a rotating QR screen, the door has a scanner, and whoever does not
check in is marked absent unless their leave was approved. Everyone signs
in through one door with an email address and a 6 digit code.

## Self-host

One command writes the compose file and the secrets. One more starts the
stack next to its own Postgres.

```bash
npx absqir@latest init my-absqir
cd my-absqir
npx absqir up
```

Set `RESEND_API_KEY` in the generated `.env`, then open
http://localhost:4321 and enter your email. The code that arrives creates
the first account, the operator's. After that, people join through
invitations. The full guide — HTTPS, configuration, upgrades, accounts —
lives in `apps/docs` and on the docs site at <https://absqir.rimzzlabs.com>.

## About this repo

A Turborepo monorepo that builds for two targets from one codebase: a Docker
image on Node.js for self-hosting, and a Cloudflare Worker for the hosted
version. Astro serves the site, Hono serves the API at `/api`, and both run
on the same origin. Everything belongs to an organization: accounts join
organizations with a role (`owner`, `admin`, `organizer`, `member`), the
directory and the groups live inside them.

## Where the build stands

All four phases are built. One-door sign-in with email codes, onboarding,
organizations and roles, the people directory with CSV import and
invitations, groups, events with a start, an end, a late threshold,
groups that are expected, a rotating QR room screen, a scanner for the
door, per-person statuses, schedules that spawn events, the member's own
events and history, a public registration page per event that also
creates accounts, leave requests that organizers approve or decline, and
now attendance reports with CSV export, a month and week calendar, and
notifications with reminders before an event, worded in each reader's
own time zone.

| Phase | Delivers                                                                  |
| ----- | ------------------------------------------------------------------------- |
| 1     | Accounts, onboarding, organizations, roles, people, groups, invitations   |
| 2     | Events with a start, an end, a late threshold, statuses, two-way check-in |
| 3     | Public registration for events, leave requests                            |
| 4     | Reports, CSV export, calendar, notifications and reminders                |

Next: the first public release. See `CONTRIBUTING.md` to build it locally.

## How the QR stays honest

The room screen's token, in `packages/api/src/lib/qr-token.ts`, is an HMAC
over the session id and the current 20 second time window, keyed by a
per-session secret that never leaves the server. The screen fetches a fresh
token when the window ends, so a photo of the code stops working almost at
once. The server accepts the current window and the one before it, so a scan
near a rotation still checks in. Only a signed-in member on the list checks
in with it, so a borrowed identifier gets nobody in.

The member's pass, in `packages/api/src/lib/member-pass.ts`, goes the other
way: an HMAC over the session id and the person id, shown as a QR code on
the member's phone and read by the organizer's scanner.

## Stack

| Layer    | Tool                                                          |
| -------- | ------------------------------------------------------------- |
| Site     | Astro 7, React 19 islands, React Compiler                     |
| UI       | shadcn CLI over Base UI, Tailwind v4, Motion, Phosphor icons  |
| API      | Hono with `@hono/zod-openapi` and Scalar                      |
| Data     | ts-belt, ts-pattern, date-fns, Dinero.js on bigint            |
| Database | Postgres through Drizzle ORM (Hyperdrive on Workers)          |
| Auth     | Better Auth with the organization plugin, email and password  |
| Email    | Resend with React Email, optional                             |
| Runtime  | Node.js in Docker for self-host, Cloudflare Workers for cloud |
| Docs     | Vocs in `apps/docs`                                           |
| CLI      | The `absqir` package in `packages/cli`                        |
| Tests    | Vitest                                                        |
| Lint     | Biome for code, Prettier for Markdown and YAML                |
| Commits  | commitlint, cz-git, Lefthook                                  |
| Release  | release-please, GitHub Actions, GHCR, npm                     |

## Layout

```
apps/
  web/
    src/
      components/      Islands. One folder per feature: auth, onboarding,
                       app-shell, people, groups, sessions, schedules,
                       check-in, my, settings, home, shared
      layouts/         Astro shells: auth, dashboard
      lib/             Clients, schemas, query client, runtime glue
      mutations/       One hook per action
      queries/         One hook per read
      pages/           sign-in, onboarding, invite, the dashboard modules, api
      middleware.ts    Session, memberships, and onboarding into locals, plus
                       the route guards
    docker-entry.mjs   Container entrypoint: migrate, then serve
  docs/                Vocs docs site and landing page
packages/
  api/
    src/
      lib/             QR token, member pass, session clock, schedules,
                       org access, slugs, CSV
      middleware/      Security, request context, session
      routes/          One file per resource: auth-flow, onboarding, me,
                       organizations, people, groups, sessions, schedules, my
      context.ts       Shared by Hono and the Astro middleware
    tests/
  auth/                Better Auth instance, email codes, organizations,
                       roles, the sign-up door
  cli/                 The absqir operator CLI, published to npm
  config/              Shared tsconfig and vitest presets
  core/                Money on bigint, dates, query keys
  db/                  Drizzle schema, client, migrations, operator ops
  transactional/       Resend mailer, the code and invitation templates
  ui/                  Base UI primitives, Tailwind theme, motion

Tests live in a `tests/` folder beside `src/`, never mixed into it.
```

The site imports the API and mounts it in `src/pages/api/[...path].ts`. One
build, one deploy, one origin. Same-origin removes CORS and keeps session
cookies on `SameSite=Lax`.

## Develop

1. Install the dependencies.

```bash
pnpm install
```

2. Create the database.

```bash
createdb absqir
```

3. Copy the environment files.

```bash
cp .env.example .env
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

4. Write a secret into `apps/web/.dev.vars`.

```bash
openssl rand -base64 32
```

5. Set `localConnectionString` in `apps/web/wrangler.jsonc` to your local
   Postgres. Miniflare needs a password in the URL, even with `trust` auth.

6. Apply the schema.

```bash
pnpm db:push
```

7. Start the stack.

```bash
pnpm dev
```

- Site and API: http://localhost:4321
- API reference: http://localhost:4321/api/reference

In dev the site reads each `packages/*` workspace straight from its
TypeScript source, so an edit there hot-reloads with no build step. Run
`pnpm dev:all` instead if you want the `tsdown` watchers as well: they keep
the `.d.ts` files fresh, which the editor needs to see a new export. Run
`pnpm dev:email` for the email preview on http://localhost:3001.

Without `RESEND_API_KEY` the server prints every sign-in code and invitation
link to its log, so you can sign up on a laptop with no mail account.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). In short: small pull requests,
conventional commits, and `pnpm check && pnpm typecheck && pnpm test` green
before you push. The repo squash-merges pull requests.

## Scripts

| Command              | Action                                              |
| -------------------- | --------------------------------------------------- |
| `pnpm dev`           | The site and the API, with hot reload               |
| `pnpm dev:all`       | The same, plus the package type watchers            |
| `pnpm dev:email`     | The email preview on port 3001                      |
| `pnpm docs:dev`      | The docs site with hot reload                       |
| `pnpm docs:build`    | Build the static docs site                          |
| `pnpm docs:preview`  | Serve the built docs site                           |
| `pnpm build`         | Build every workspace for Cloudflare                |
| `pnpm build:node`    | Build every workspace for the Node target           |
| `pnpm preview`       | Serve the built Worker                              |
| `pnpm deploy`        | Build, then `wrangler deploy`                       |
| `pnpm typecheck`     | `tsc` and `astro check`                             |
| `pnpm check`         | Biome lint and format check                         |
| `pnpm fix`           | Biome, with fixes applied                           |
| `pnpm format`        | Prettier over Markdown and YAML                     |
| `pnpm cf:types`      | Write `worker-configuration.d.ts` from the bindings |
| `pnpm cf:hyperdrive` | Create a Hyperdrive config                          |
| `pnpm cf:secret`     | Put a production secret                             |
| `pnpm db:generate`   | Write a migration from the schema                   |
| `pnpm db:migrate`    | Apply the migrations                                |
| `pnpm db:push`       | Push the schema, no migration file                  |
| `pnpm db:studio`     | Open Drizzle Studio                                 |

## Environment

Two sources, because two runtimes read them.

- `apps/web/wrangler.jsonc` holds the bindings and the plain variables. The
  Worker reads them.
- `apps/web/.dev.vars` holds the local secrets. Never commit this file.
- `.env` at the root holds `DATABASE_URL` for drizzle-kit only. The Worker does
  not read it.

`@t3-oss/env-core` validates the Worker variables in `packages/api/src/env.ts`.
A missing or short secret stops the request with a clear message.

Put a production secret with:

```bash
pnpm cf:secret BETTER_AUTH_SECRET
```

## Deploy

Self-hosting runs the published Docker image — see the
[docs site](https://absqir.rimzzlabs.com). This
section covers deploying your own Cloudflare Worker from source.

1. Create a Hyperdrive config against your production Postgres.

```bash
pnpm cf:hyperdrive -- --connection-string="postgresql://user:password@host:5432/absqir"
```

2. Copy the returned id into `hyperdrive[0].id` in `apps/web/wrangler.jsonc`.

3. Put the secrets.

```bash
pnpm cf:secret BETTER_AUTH_SECRET
pnpm cf:secret RESEND_API_KEY
```

4. Apply the migrations against production, then deploy.

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
pnpm deploy
```

## Security

The API applies these on every request:

- **Headers**: a `default-src 'none'` content security policy, `nosniff`,
  `frame-ancestors 'none'`, `no-referrer`, and HSTS in production. The Scalar
  page gets a wider policy because it loads a CDN bundle.
- **CSRF**: `hono/csrf` rejects a cross-origin form post. JSON requests are
  covered by the same-origin rule.
- **Body limit**: 64 KB.
- **Rate limit**: the Cloudflare rate limit binding, keyed on
  `CF-Connecting-IP`. The edge sets that header, so a client cannot forge it.
- **Auth**: Better Auth adds its own limits, 5 sign-ins per minute, 3 codes
  per minute, 5 code checks per minute. Passwords are 12 characters or more.
  These limits are off while `ENVIRONMENT` is `development`.
- **Cookies**: `HttpOnly` always. `Secure` when `ENVIRONMENT` is `production`.
- **Errors**: the handler returns a request id, never the internal message.

Two controls change with the environment, because a strict value blocks local
work:

| Control        | Development | Production                     |
| -------------- | ----------- | ------------------------------ |
| HSTS           | off         | on                             |
| Secure cookies | off         | on                             |
| API docs       | on          | off, unless `ENABLE_DOCS=true` |

## Email

Sign-in codes and invitations travel by email. `RESEND_API_KEY` is required
when `ENVIRONMENT` is `production`; the request fails with a clear message
without it. Outside production the mailer is optional and the server logs
what it would have sent. The templates live in
`packages/transactional/src/emails/`.

## Conventions

- Absolute imports. Every package maps `@/*` to its own `src/*`.
- `verbatimModuleSyntax` is on in every workspace.
- Biome formats code, JSON, and CSS. Prettier formats Markdown and YAML,
  because Biome does not read those.
- Lefthook runs Biome and Prettier before a commit, and `typecheck` before a
  push.

## Data rules

Four libraries cover data work. Each has one job.

| Need                           | Use                                      |
| ------------------------------ | ---------------------------------------- |
| Transform, group, or fold data | `@mobily/ts-belt` (v4 release candidate) |
| Branch on a shape or a union   | `ts-pattern`                             |
| Read or format a date          | `date-fns`, through `@absqir/core/date`  |
| Hold or compute an amount      | `@absqir/core/money`                     |

Three rules go with them.

1. **Data is read-only in the browser.** An island renders what it is given. It
   never rewrites a collection in place.
2. **Aggregation happens on the server.** Sums, group-bys, and joins run in the
   API where the data comes from, not in a component.
3. **Money is never a float.** An amount is a bigint of minor units in Postgres
   and a `Money` value in code. `moneyColumn()` in the schema and
   `toMinorUnits` / `fromMinorUnits` in `@absqir/core/money` are the only bridge.

```ts
const price = money({ amount: 1234n, currency: USD }); // $12.34
const shares = split(price, [1n, 1n, 1n]); // no cent is lost
```

`match` from `ts-pattern` replaces a chain of `if`. Use `.exhaustive()` so a new
case in a union becomes a type error instead of a silent fall-through.

## UI

`packages/ui` holds the design system. The shadcn CLI writes into it, over Base
UI rather than Radix.

```bash
pnpm dlx shadcn@latest add <component> -c packages/ui
```

The app imports one component per path, so nothing unused is bundled:

```tsx
import { Button } from "@absqir/ui/button";
import { Reveal } from "@absqir/ui/reveal";
```

- **Icons** come from `@phosphor-icons/react`. Import the `*Icon` name, such as
  `XIcon`. The bare name is deprecated.
- **Motion** comes from `motion`. Wrap an animated island in `MotionProvider`
  and build entrances with `Reveal`. Every popup in `packages/ui` (dialog,
  sheet, popover, tooltip, menu, select, combobox) animates through
  `popup-motion.tsx`, not CSS keyframes. The root hands Base UI an
  `actionsRef` and `MotionPopup` unmounts the popup after the exit completes.
  Drawer, toast, accordion, and collapsible keep Base UI's own transitions,
  because Base UI measures or swipes those itself.
- **shadcn refresh**: `shadcn add --overwrite` rewrites a component from the
  registry and drops the `render` props that hook Motion in. After an
  overwrite, diff the file against git and restore the `MotionPopup` render.
- **Reduced motion** is honoured twice: `MotionConfig reducedMotion="user"` for
  React animation, and a `prefers-reduced-motion` block in `globals.css` for
  every CSS transition and keyframe. You do not opt in per component.
- **Fonts** are Inter for sans, JetBrains Mono for mono, and Merriweather for
  serif. Astro downloads them at build time and serves them from our own origin,
  so no request leaves for a font CDN.

## Tests

Vitest runs per package, so Turbo caches each result on its own.

```bash
pnpm test
pnpm --filter @absqir/core test:watch
```

`packages/core` and `packages/api` run on Node. `packages/ui` runs on jsdom with
Testing Library. `vitest.shared.ts` at the root holds the settings they share.

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org).
Lefthook checks the message, and CI checks every commit in a pull request.

```bash
pnpm commit
```

The prompt limits the scope to one of: `web`, `api`, `auth`, `db`, `ui`, `core`,
`email`, `ci`, `deps`, `repo`.

## Releases

release-please reads the commits on `main` and keeps a release pull request open
with the next version and the changelog entries. Merge that pull request to cut
a release.

1. A pull request into `main` runs lint, format, types, tests, both target
   builds, a Docker build, and the commit message check.
2. Merging the release pull request tags the version and writes `CHANGELOG.md`.
3. The tag publishes the Docker image to `ghcr.io` (amd64 and arm64) and the
   `absqir` CLI to npm. The tagged commit is the squash merge of a pull request
   CI already checked, so nothing runs twice.
4. A failed publish runs again from the Actions page: start the Release
   workflow by hand with the tag as input.

The CLI publishes through npm trusted publishing, so no npm token lives in the
repository. The Docker image publishes with the built-in `GITHUB_TOKEN`. The
docs site needs two repository secrets:

| Secret                  | Used for                           |
| ----------------------- | ---------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | the docs site deploy on Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | the docs site deploy on Cloudflare |

Dependabot opens one grouped pull request a week for the GitHub Actions and
one for npm minor and patch updates. Major npm updates arrive on their own.
| `DATABASE_URL` | `drizzle-kit migrate` on Cloudflare deploy |

## Pages and the session

Every page renders per request because each one depends on the reader.

| Path                     | Who can open it | Behaviour                                  |
| ------------------------ | --------------- | ------------------------------------------ |
| `/`                      | Signed in       | Dashboard: create and list sessions        |
| `/sessions/[id]`         | Signed in       | Live check-ins, toggle, CSV export, delete |
| `/sessions/[id]/display` | Signed in       | Full-screen rotating QR for the projector  |
| `/a/[id]`                | Anyone          | Check-in form, opened from a scanned QR    |
| `/sign-in`               | Signed out      | Signed-in readers go to `/`                |
| `/sign-up`               | Signed out      | Signed-in readers go to `/`                |

The middleware sends a signed-out reader of a private page to
`/sign-in?next=…`. The ownership check runs in the API, so a session page for
another user's session renders an error, not the data.

`src/middleware.ts` reads the session once per request, puts the user on
`Astro.locals`, and applies the guard. The page passes that user into the island
as a prop, so the panel never flashes a signed-out state before hydrating.
Every page answer carries `Cache-Control: private, no-store`.

## How the session stays alive

There is no refresh token here, and none is needed. Better Auth uses a **rolling
database session**: an opaque token in an HttpOnly cookie, with a row in the
`session` table that holds `expiresAt`.

Reading the session is what renews it.

1. A request arrives with the session cookie.
2. If the session is older than `updateAge` (1 day), Better Auth pushes
   `expiresAt` out to now + `expiresIn` (30 days) and re-sets the cookie.
3. If it is not that old yet, nothing is written.

So an active reader is never signed out, and an idle one has 30 days. A JWT
access and refresh token pair solves a different problem: it lets a stateless
service verify a token without asking the database. This app has one origin and
one database, so the cookie is simpler and can be revoked instantly.

Three things keep it working:

- **`src/middleware.ts`** reads the session on every page request, which renews
  it as a side effect.
- **`useSession()`** refetches on window focus, on reconnect, and every four
  minutes, which is just under the five minute cookie cache. An open tab
  therefore keeps its own session alive.
- **"Keep me signed in"** maps to Better Auth's `rememberMe`. Unchecked, the
  cookie dies when the browser closes.

Tune the window in `packages/auth/src/index.ts`.

## Forms and data fetching

Forms use React Hook Form with a Zod resolver. Fields bind through `control` and
the design system's `FormField`, never by spreading `register()` onto an input.

```tsx
<FormField
  control={form.control}
  name="email"
  label="Email"
  render={(field) => <Input {...field} type="email" />}
/>
```

Data fetching uses TanStack Query. Each query and mutation is a hook in its own
directory, so a component reads as a list of capabilities:

```tsx
const health = useHealth();
const session = useSession();
const signOut = useSignOut();
```

Every key comes from the factory in `@absqir/core/query-keys`. Do not write an
inline `["session"]` array anywhere: keys drift, and a cache read then stops
matching the cache write. `queryFn` is the one place the frontend throws,
because TanStack Query turns a throw into error state for the UI.
