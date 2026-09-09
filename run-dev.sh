#!/usr/bin/env bash
# Starts the API, the x402 paid service and the MCP server together.
# Loads .env, then waits until all three answer their health endpoint.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a

for port in "${PORT:-8080}" "${PAID_SERVICE_PORT:-8402}" "${MCP_PORT:-8081}"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Stop what is on it, or change the port in .env." >&2
    exit 1
  fi
done

mkdir -p .logs
pnpm --filter @pocket/api          exec tsx src/index.ts > .logs/api.log   2>&1 &
pnpm --filter @pocket/paid-service exec tsx src/index.ts > .logs/paid.log  2>&1 &
pnpm --filter @pocket/mcp          exec tsx src/index.ts > .logs/mcp.log   2>&1 &

until curl -sf "http://localhost:${PORT:-8080}/v1/health"        >/dev/null \
   && curl -sf "http://localhost:${PAID_SERVICE_PORT:-8402}/health" >/dev/null \
   && curl -sf "http://localhost:${MCP_PORT:-8081}/health"       >/dev/null; do sleep 1; done

echo "Pocket is up:"
echo "  API           http://localhost:${PORT:-8080}"
echo "  MCP           http://localhost:${MCP_PORT:-8081}/mcp"
echo "  Paid service  http://localhost:${PAID_SERVICE_PORT:-8402}"
echo "  Logs in .logs/"
wait
