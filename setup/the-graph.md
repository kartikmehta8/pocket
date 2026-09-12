# The Graph — composed market data and spend intelligence

The Graph does two separate jobs in Pocket, and only one of them needs keys.

Part of [setup](README.md). Independent of [Privy](privy.md) and
[Hedera](hedera.md).

## Price-gated policy (needs two credentials)

A limit written in tokens is not a limit on money. An agent allowed "2 HBAR"
per payment is allowed an unbounded amount of value if HBAR moves. The
`maxUsdPerTransaction` policy field bounds the money instead, and it is priced
by **two Graph products that check each other**:

1. **The Graph Token API**, a hosted REST product.
2. **A Subgraph served by the decentralized gateway.**

Composing them is the point. A single price feed is a single point of failure
for a control that decides whether money moves, so the two must agree within a
tolerance. When they disagree, Pocket returns no price and the policy engine
**denies**. It never guesses.

**Get the Token API credential.** Sign in at
**https://thegraph.com/token-api/**, open The Graph Market dashboard, and copy
the API token (a JWT).

**Get the gateway credential.** Sign in at **https://thegraph.com/studio**,
open **API Keys**, create one, and copy it. Then find a subgraph in **The Graph
Explorer** that prices tokens on your chosen EVM network and copy its query
URL.

```bash
GRAPH_TOKEN_API_URL=https://token-api.thegraph.com
GRAPH_TOKEN_API_JWT=your-market-jwt
GRAPH_PRICE_SUBGRAPH_URL=https://gateway.thegraph.com/api/subgraphs/id/<ID>
GRAPH_API_KEY=your-studio-key
GRAPH_PRICE_NETWORK=mainnet
GRAPH_PRICE_USDC_CONTRACT=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
GRAPH_PRICE_TOLERANCE_BPS=200
```

**Both are required.** With only one set, pricing stays off, `/v1/health`
reports `market: unpriced`, and any policy carrying a USD ceiling denies rather
than silently losing the control.

Try it:

```bash
curl -sX PUT localhost:8080/v1/agents/<AGENT_ID>/policy \
  -H "authorization: Bearer $POCKET_API_KEY" -H 'content-type: application/json' \
  -d '{"allowedAssets":["USDC"],"allowedChains":["hedera-testnet"],
       "allowedCategories":["research"],"maxTransactionAmount":"2",
       "trustedRecipients":[],"unknownRecipientBehaviour":"require_approval",
       "maxUsdPerTransaction":"1.00"}'
```

Every priced decision records the quotes it relied on in the audit trail, so a
refusal can be explained after the fact.

## Spend reconciliation (no keys, self-hosted)

Separately, Pocket compares its own ledger against what actually settled on
chain. **The Graph does not support Hedera**: it is absent from
[the supported networks](https://thegraph.com/docs/en/supported-networks/), and
Hedera's own docs say the hosted service is unavailable and you must run a
local Graph Node. So there is no URL to paste and no key to obtain here.

This repository ships that indexer in [`subgraph/`](../subgraph/README.md):

```bash
cd subgraph && npm install && npm run node:up
npm run codegen && npm run build
npm run create-local && npm run deploy-local
```

```bash
GRAPH_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/pocket/transfers
```

HBAR is native and emits no ERC-20 transfer event, so reconciliation is a
token-settled feature. Paying in HBAR still works; analytics stay on the ledger
source and say so.

## Check it worked

```bash
curl -s localhost:8080/v1/health | jq '.adapters.analytics, .adapters.market'
```
