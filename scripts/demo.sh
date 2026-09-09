#!/usr/bin/env bash
# Runs the Pocket demo end to end against a already-running stack.
#
#   ./run-dev.sh          # in another terminal
#   ./scripts/demo.sh
#
# Buys three real data feeds the task budget can afford, then tries one it
# cannot, so the policy engine is visibly the thing deciding rather than the
# agent. Every feed is backed by a live upstream: CoinGecko, a public Ethereum
# node, and DefiLlama.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

API=${POCKET_API_URL:-http://localhost:8080}
SELLER=${SELLER_URL:-http://localhost:8402}
KEY=${POCKET_API_KEY:?Run "pnpm seed" and put the key in .env first}

auth=(-H "authorization: Bearer $KEY")
json=(-H 'content-type: application/json')

# The seller's payee address, so the demo can pick an agent whose policy
# actually trusts it. An agent that escalates every payment to a human is a
# correct outcome but a confusing demonstration.
PAYEE=$(curl -s "$SELLER/health" | python3 -c 'import sys,json; print(json.load(sys.stdin)["payToAddress"].lower())')

AGENT=$(curl -s "${auth[@]}" "$API/v1/agents" | python3 -c "
import sys, json, urllib.request

payee = '$PAYEE'
agents = json.load(sys.stdin)['agents']
fundable = [a for a in agents if a.get('budget') and a.get('wallet')]


def trusts(agent_id):
    '''Whether this agent's policy already trusts the seller.'''
    request = urllib.request.Request(
        '$API/v1/agents/' + agent_id, headers={'authorization': 'Bearer $KEY'}
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        policy = json.load(response).get('policy') or {}
    return payee in [r.lower() for r in policy.get('trustedRecipients', [])]


preferred = [a for a in fundable if trusts(a['id'])]
chosen = (preferred or fundable)
print(chosen[0]['id'] if chosen else '')
print('trusted' if preferred else 'untrusted')
")
STANCE=$(echo "$AGENT" | tail -1)
AGENT=$(echo "$AGENT" | head -1)
[ -n "$AGENT" ] || { echo "No agent with a wallet and a budget. Run: pnpm seed" >&2; exit 1; }

TASK=$(curl -s -X POST "${auth[@]}" "${json[@]}" "$API/v1/agents/$AGENT/task-budgets" \
  -d '{"label":"Research the ETH ecosystem","asset":"USDC","limit":"0.50"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["taskBudget"]["id"])')

echo "Agent        $AGENT"
echo "Task budget  $TASK  (0.50 USDC)"
echo "Seller       $PAYEE"
if [ "$STANCE" != "trusted" ]; then
  echo
  echo "Note: this agent's policy does not list the seller as a trusted recipient,"
  echo "so every purchase below will be HELD for human approval rather than paid."
  echo "Add $PAYEE to its trusted recipients to see payments settle."
fi
echo

buy() {
  echo "--- $1 ---"
  ./scripts/mcp-call.sh pocket_pay_for_resource \
    "{\"agentId\":\"$AGENT\",\"url\":\"$SELLER$1\",\"reason\":\"$2\",\"category\":\"$3\",\"taskBudgetId\":\"$TASK\"}" \
    | python3 scripts/format-purchase.py
  echo
}

buy /v1/market/prices        "Spot prices for the portfolio view"   data
buy /v1/network/gas          "Fee check before batching writes"     data
buy /v1/research/eth-brief   "Morning ETH ecosystem briefing"       research
buy /v1/research/deep-dive   "Full ecosystem deep dive"             research

echo "--- spend summary ---"
./scripts/mcp-call.sh pocket_spend_summary '{"days":7}' | python3 scripts/format-summary.py
