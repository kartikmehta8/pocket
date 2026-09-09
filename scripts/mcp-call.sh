#!/usr/bin/env bash
# Call one Purse MCP tool and print its JSON result.
#   ./scripts/mcp-call.sh purse_list_agents '{}'
set -euo pipefail
TOOL=${1:?tool name required}
ARGS=${2:-'{}'}
MCP_URL=${MCP_URL:-http://localhost:8081/mcp}

curl -s -X POST "$MCP_URL" \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$TOOL\",\"arguments\":$ARGS}}" \
  | sed 's/^data: //' | grep -v '^$' | tail -1 \
  | python3 -c 'import sys,json; print(json.loads(sys.stdin.read())["result"]["content"][0]["text"])'
