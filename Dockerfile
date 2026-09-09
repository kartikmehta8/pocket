# One image, three services. `APP` selects which workspace package to run, so
# the API, the MCP server and the paid service share a single build and a
# single dependency graph rather than drifting apart across three Dockerfiles.
#
#   docker build --build-arg APP=api -t purse-api .
#   docker build --build-arg APP=mcp -t purse-mcp .
#   docker build --build-arg APP=paid-service -t purse-paid .
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
 && pnpm -r --filter './apps/*' --filter '!@purse/dashboard' build

# Drop dev dependencies from the tree that ships.
RUN pnpm prune --prod --ignore-scripts

# --- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime
ARG APP=api
ENV NODE_ENV=production APP=${APP}
WORKDIR /app

# Never run as root, and never own the files the process reads.
RUN addgroup -S purse && adduser -S purse -G purse
COPY --from=build --chown=purse:purse /app /app
USER purse

EXPOSE 8080
# `APP` is read at start rather than baked into the entrypoint array, so one
# image can be run as any of the three services.
CMD ["sh", "-c", "node apps/${APP}/dist/index.js"]
