# Next.js standalone build for the dashboard.
#
# Build from the REPOSITORY ROOT, not from this directory — the dashboard
# depends on nothing in the workspace at runtime, but pnpm still needs the
# lockfile and workspace manifest to install:
#
#   docker build -f apps/dashboard/Dockerfile -t purse-dashboard .
#
# NEXT_PUBLIC_* values are inlined at build time, so they are build args rather
# than runtime environment. Server-side values (PURSE_API_URL) stay runtime.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/dashboard/package.json apps/dashboard/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --filter @purse/dashboard...

FROM deps AS build
ARG NEXT_PUBLIC_PRIVY_APP_ID=""
ARG NEXT_PUBLIC_MCP_URL="http://localhost:8081/mcp"
ARG NEXT_PUBLIC_PAID_SERVICE_URL=""
ENV NEXT_PUBLIC_PRIVY_APP_ID=${NEXT_PUBLIC_PRIVY_APP_ID} \
    NEXT_PUBLIC_MCP_URL=${NEXT_PUBLIC_MCP_URL} \
    NEXT_PUBLIC_PAID_SERVICE_URL=${NEXT_PUBLIC_PAID_SERVICE_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY tsconfig.base.json ./
COPY apps/dashboard apps/dashboard
RUN pnpm --filter @purse/dashboard build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S purse && adduser -S purse -G purse

# The standalone output carries only the files the server actually loads.
COPY --from=build --chown=purse:purse /app/apps/dashboard/.next/standalone ./
COPY --from=build --chown=purse:purse /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=build --chown=purse:purse /app/apps/dashboard/public ./apps/dashboard/public

USER purse
EXPOSE 3000
CMD ["node", "apps/dashboard/server.js"]
