# syntax=docker/dockerfile:1

# The build stage runs on the runner's own platform, once, for every target
# platform. Its output is plain JavaScript with no native binaries, so the
# runtime stage below only copies it. Nothing in the app is emulated.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
RUN npm install -g pnpm@10.30.1
WORKDIR /repo

# Manifests first. A source change then keeps the install layer from the cache,
# and only a lockfile change runs pnpm install again.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
COPY apps/docs/package.json apps/docs/
COPY apps/web/package.json apps/web/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/cli/package.json packages/cli/
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/transactional/package.json packages/transactional/
COPY packages/ui/package.json packages/ui/
# --ignore-scripts skips the repo's git-dependent prepare hook. The build does
# not need any dependency's postinstall: native binaries ship as optional deps.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @absqir/web...

# Sources. The docs site and the CLI do not ship in this image.
COPY turbo.json ./
COPY packages packages
COPY apps/web apps/web
ENV DEPLOY_TARGET=node
RUN pnpm exec turbo run build --filter=@absqir/web...
# --legacy: pack workspace packages instead of requiring injected deps.
# node-linker=hoisted: the server bundle imports packages that are not direct
# dependencies of the web app (date-fns, prettier, framer-motion). With pnpm's
# default layout those sit only inside the .pnpm store, and Node cannot resolve
# them from dist/. A flat node_modules puts every package at the top level.
RUN pnpm --filter @absqir/web deploy --legacy --prod --ignore-scripts --config.node-linker=hoisted /out

FROM node:24-alpine AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
WORKDIR /app
COPY --from=build /out .
COPY --from=build /repo/packages/db/drizzle ./migrations
EXPOSE 4321
USER node
CMD ["node", "docker-entry.mjs"]
