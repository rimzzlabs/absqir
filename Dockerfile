# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
RUN npm install -g pnpm@10.30.1
WORKDIR /repo
COPY . .
# --ignore-scripts skips the repo's git-dependent prepare hook. The build does
# not need any dependency's postinstall: native binaries ship as optional deps.
RUN pnpm install --frozen-lockfile --ignore-scripts
ENV DEPLOY_TARGET=node
RUN pnpm build
# --legacy: pack workspace packages instead of requiring injected deps.
RUN pnpm --filter @absqir/web deploy --legacy --prod --ignore-scripts /out

FROM node:24-alpine AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
WORKDIR /app
COPY --from=build /out .
COPY --from=build /repo/packages/db/drizzle ./migrations
EXPOSE 4321
USER node
CMD ["node", "docker-entry.mjs"]
