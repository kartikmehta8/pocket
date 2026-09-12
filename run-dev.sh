#!/usr/bin/env bash
# Starts the API, the x402 paid service and the MCP server together.
# Loads .env, then waits until all three answer their health endpoint.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a

# Which build is running, for each service's own home route. A checkout is not
# a deployment, so this is the commit in the working tree rather than one that
# was ever released, and the timestamp is when these processes were started.
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "")
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
export GIT_COMMIT BUILD_TIME

for port in "${PORT:-8080}" "${PAID_SERVICE_PORT:-8402}" "${MCP_PORT:-8081}"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Stop what is on it, or change the port in .env." >&2
    exit 1
  fi
done

mkdir -p .logs
pnpm --filter @pocket/api          exec tsx watch src/index.ts > .logs/api.log   2>&1 &
pnpm --filter @pocket/paid-service exec tsx watch src/index.ts > .logs/paid.log  2>&1 &
pnpm --filter @pocket/mcp          exec tsx watch src/index.ts > .logs/mcp.log   2>&1 &

until curl -sf "http://localhost:${PORT:-8080}/v1/health"        >/dev/null \
   && curl -sf "http://localhost:${PAID_SERVICE_PORT:-8402}/health" >/dev/null \
   && curl -sf "http://localhost:${MCP_PORT:-8081}/health"       >/dev/null; do sleep 1; done

echo "Pocket is up:"
echo "  API           http://localhost:${PORT:-8080}"
echo "  MCP           http://localhost:${MCP_PORT:-8081}/mcp"
echo "  Paid service  http://localhost:${PAID_SERVICE_PORT:-8402}"
echo "  Logs in .logs/"
echo "  Build ${GIT_COMMIT:-unknown} started ${BUILD_TIME}"
wait
