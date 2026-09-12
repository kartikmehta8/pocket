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
ARG NEXT_PUBLIC_APP_URL="https://www.pocket-app.xyz"
# The address this site gives out in every canonical link, sitemap entry and
# preview card. Inlined at build like every NEXT_PUBLIC_ value, so setting it
# at run time would be too late.
ARG NEXT_PUBLIC_DOCS_DOMAIN="docs.pocket-app.xyz"
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_DOCS_DOMAIN=${NEXT_PUBLIC_DOCS_DOMAIN} \
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
# Screenshots and vendor marks. Standalone traces the server's own imports and
# knows nothing about what the pages link to, so anything under public/ has to
# be carried across by hand or every image on the site answers 404.
COPY --from=build --chown=pocket:pocket /app/apps/docs/public ./apps/docs/public

USER pocket
EXPOSE 3001
CMD ["node", "apps/docs/server.js"]
