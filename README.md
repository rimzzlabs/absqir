# absqir

QR attendance on one Cloudflare Worker. An organizer creates a session and
projects its QR screen. A reader scans the code with a phone camera, fills in
a name and an ID, and the check-in appears on the dashboard within seconds.

The repo is a Turborepo monorepo built from the `halo` template. Astro serves
the site, Hono serves the API at `/api`, and both run on the same origin.

## How the QR stays honest

The QR code encodes `/a/{sessionId}?t={token}`. The token is an HMAC over the
session id and the current 20 second time window, keyed by a per-session
secret that never leaves the server. The screen fetches a fresh token when
the window ends, so a photo of the code stops working almost at once. The
server accepts the current window and the one before it, so a scan near a
rotation still checks in. One identifier can check in once per session: a
unique index on `(session_id, identifier)` rejects the second try with a 409.

The token code lives in `packages/api/src/lib/qr-token.ts`. The attendance
routes live in `packages/api/src/routes/attendance-sessions.ts` (owner only)
and `packages/api/src/routes/check-in.ts` (public).

## Stack

| Layer    | Tool                                                         |
| -------- | ------------------------------------------------------------ |
| Site     | Astro 7, React 19 islands, React Compiler                    |
| UI       | shadcn CLI over Base UI, Tailwind v4, Motion, Phosphor icons |
| API      | Hono with `@hono/zod-openapi` and Scalar                     |
| Data     | ts-belt, ts-pattern, date-fns, Dinero.js on bigint           |
| Database | Postgres through Drizzle ORM and Cloudflare Hyperdrive       |
| Auth     | Better Auth, email and password                              |
| Email    | Resend with React Email                                      |
| Runtime  | Cloudflare Workers                                           |
| Tests    | Vitest                                                       |
| Lint     | Biome for code, Prettier for Markdown and YAML               |
| Commits  | commitlint, cz-git, Lefthook                                 |
| Release  | release-please, GitHub Actions                               |

## Layout

```
apps/
  web/
    src/
      components/      Islands. One folder per feature.
      layouts/         Astro shells
      lib/             Clients, schemas, query client
      mutations/       useSignIn, useSignUp, useSignOut
      queries/         useHealth, useSession
      pages/           index (private), sign-in, sign-up, api/[...path]
      middleware.ts    Session into locals, plus the route guard
packages/
  api/
    src/
      middleware/      Security, request context, session
      routes/          One file per resource
      context.ts       Shared by Hono and the Astro middleware
    tests/
  auth/                Better Auth instance
  config/              Shared tsconfig and vitest presets
  core/                Money on bigint, dates, query keys
  db/                  Drizzle schema, client, migrations
  transactional/       Resend mailer and React Email templates
  ui/                  Base UI primitives, Tailwind theme, motion

Tests live in a `tests/` folder beside `src/`, never mixed into it.
```

The site imports the API and mounts it in `src/pages/api/[...path].ts`. One
build, one deploy, one origin. Same-origin removes CORS and keeps session
cookies on `SameSite=Lax`.

## First run

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
pnpm dev:all
```

- Site and API: http://localhost:4321
- API reference: http://localhost:4321/api/reference
- Email preview: http://localhost:3001

## Repository settings

GitHub copies files from a template, but not settings. After you create a
repo from this template, run these two commands once. Replace `OWNER/REPO`.

```bash
gh api -X PATCH repos/OWNER/REPO \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=COMMIT_MESSAGES \
  -F has_projects=false

gh api -X PUT repos/OWNER/REPO/actions/permissions/workflow \
  -f default_workflow_permissions=read \
  -F can_approve_pull_request_reviews=true
```

The first command allows only squash merges for pull requests. The squash
commit takes its title from the PR title and its body from the PR commits.
It also hides the Projects tab. The second command lets release-please open
its release PR.

Local merges rebase instead: `pnpm install` sets `git config pull.rebase
true` for the clone through the `prepare` script.

To hide the Packages section on the repo home page, open the gear icon next
to "About" and clear the "Packages" checkbox. GitHub has no API for this
switch.

## Scripts

| Command              | Action                                              |
| -------------------- | --------------------------------------------------- |
| `pnpm dev:all`       | Web, API watcher, and the email preview             |
| `pnpm build`         | Build every workspace                               |
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
- **Auth**: Better Auth adds its own limits, 5 sign-ins per minute and 10
  sign-ups per hour. Passwords are 12 characters or more.
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

Email verification stays off until `RESEND_API_KEY` is set. The stack runs with
no Resend account. Add the key and Better Auth sends the welcome template from
`packages/transactional/src/emails/welcome.tsx`.

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
  and build entrances with `Reveal`.
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

1. A pull request into `main` runs lint, format, types, tests, build, and the
   commit message check.
2. Merging the release pull request tags the version and writes `CHANGELOG.md`.
3. The tag runs the full check again, applies the database migrations, then
   deploys to Cloudflare.

Set these repository secrets before the first release:

| Secret                  | Used for                        |
| ----------------------- | ------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | `wrangler deploy`               |
| `CLOUDFLARE_ACCOUNT_ID` | `wrangler deploy`               |
| `DATABASE_URL`          | `drizzle-kit migrate` on deploy |

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
