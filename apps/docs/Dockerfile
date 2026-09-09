# Next.js standalone build for the documentation site.
#
# Build from the REPOSITORY ROOT, not from this directory — pnpm needs the
# lockfile and workspace manifest to install:
#
#   docker build -f apps/docs/Dockerfile -t pocket-docs .
#
# NEXT_PUBLIC_* values are inlined at build time, so they are build args rather
# than runtime environment.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/docs/package.json apps/docs/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --filter @pocket/docs...

FROM deps AS build
ARG NEXT_PUBLIC_APP_URL="https://pocket-app.xyz"
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY tsconfig.base.json ./
COPY apps/docs apps/docs
RUN pnpm --filter @pocket/docs build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S pocket && adduser -S pocket -G pocket

COPY --from=build --chown=pocket:pocket /app/apps/docs/.next/standalone ./
COPY --from=build --chown=pocket:pocket /app/apps/docs/.next/static ./apps/docs/.next/static
# No public/ here, unlike the dashboard: this site ships no static files of its
# own. Add the copy back alongside the directory if that changes.

USER pocket
EXPOSE 3001
CMD ["node", "apps/docs/server.js"]
