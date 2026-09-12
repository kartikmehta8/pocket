# One image, three services. `APP` selects which workspace package to run, so
# the API, the MCP server and the paid service share a single build and a
# single dependency graph rather than drifting apart across three Dockerfiles.
#
#   docker build --build-arg APP=api -t pocket-api .
#   docker build --build-arg APP=mcp -t pocket-mcp .
#   docker build --build-arg APP=paid-service -t pocket-paid .
#
# The dashboard is a Next.js app and builds separately; see DEPLOY.md.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# --- dependencies -----------------------------------------------------------
# Manifests first, so a source-only change reuses the installed layer.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json      packages/core/
COPY packages/db/package.json        packages/db/
COPY packages/adapters/package.json  packages/adapters/
COPY apps/api/package.json           apps/api/
COPY apps/mcp/package.json           apps/mcp/
COPY apps/paid-service/package.json  apps/paid-service/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# --- build ------------------------------------------------------------------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
COPY apps/mcp apps/mcp
COPY apps/paid-service apps/paid-service
RUN pnpm -r --filter './packages/*' build \
 && pnpm -r --filter './apps/*' --filter '!@pocket/dashboard' build

# --- migrations -------------------------------------------------------------
# Schema changes are applied by a one-off container before the serving images
# roll, never by a service on boot: two API replicas starting together would
# otherwise race each other through the same migration.
#
# It forks off `build` rather than the runtime image so that it carries
# drizzle-kit, which is a dev dependency and has no business in a server.
FROM build AS migrate
WORKDIR /app
CMD ["pnpm", "--filter", "@pocket/db", "push", "--force"]

# --- runtime ----------------------------------------------------------------
# `pnpm prune --prod` is deliberately not used here. It removes the links to the
# workspace packages along with the dev dependencies, and the server then dies
# on its first import of @pocket/adapters. The image carries the dev tree as a
# result; shrinking it wants `pnpm deploy`, which is a change worth making on
# its own rather than smuggling into a release.

FROM node:22-alpine AS runtime
ARG APP=api
# Which build this is, so a running service can say so on its own home route.
# Both are optional: unset, a service reports only when its process started.
ARG GIT_COMMIT=""
ARG BUILD_TIME=""
ENV NODE_ENV=production APP=${APP} GIT_COMMIT=${GIT_COMMIT} BUILD_TIME=${BUILD_TIME}
WORKDIR /app

# Never run as root, and never own the files the process reads.
RUN addgroup -S pocket && adduser -S pocket -G pocket
COPY --from=build --chown=pocket:pocket /app /app
USER pocket

EXPOSE 8080
# `APP` is read at start rather than baked into the entrypoint array, so one
# image can be run as any of the three services.
CMD ["sh", "-c", "node apps/${APP}/dist/index.js"]
