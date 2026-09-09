# Purse subgraph

Indexes ERC-20 `Transfer` events on Hedera so Purse can compare what it
authorized against what actually settled.

**Why this directory exists.** The Graph's decentralized network and Subgraph
Studio do not support Hedera. Hedera's own documentation says the hosted
service is unavailable and that you must run a local Graph Node. So there is no
subgraph URL to paste; you host one. This is that subgraph.

## Run it

```bash
cd subgraph
npm install
npm run node:up          # Graph Node + IPFS + Postgres, via Docker
```

Pick a start block before deploying. Indexing Hedera from block 0 takes a very
long time, and you only care about payments made from now on:

```bash
curl -s -X POST https://testnet.hashio.io/api \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}'
```

Put that number, minus a small margin, into `startBlock` in `subgraph.yaml`.
While you are there, set `address` to the token you are actually settling in.
It defaults to Hedera testnet USDC, `0.0.429274`.

Then build and deploy:

```bash
npm run codegen
npm run build
npm run create-local
npm run deploy-local
```

Point Purse at it, in the repo-root `.env`:

```bash
GRAPH_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/purse/transfers
GRAPH_API_KEY=
```

`GRAPH_API_KEY` stays empty. It is only for The Graph's hosted gateway; a local
node has no authentication.

## Check it is indexing

```bash
curl -s http://localhost:8030/graphql -H 'content-type: application/json' \
  -d '{"query":"{ indexingStatuses { subgraph synced health chains { chainHeadBlock { number } latestBlock { number } } } }"}'
```

And query it the way Purse does:

```bash
curl -s http://localhost:8000/subgraphs/name/purse/transfers \
  -H 'content-type: application/json' \
  -d '{"query":"{ transfers(first:5, orderBy: timestamp, orderDirection: desc) { transaction from to value timestamp token { symbol } } }"}'
```

## Filter syntax gotcha

graph-node rejects a `where` clause that mixes top-level fields with `or`,
failing with the unhelpful `Filter must by an object`. The window bounds have
to be repeated inside each branch:

```graphql
# works
where: { or: [
  { from: $address, timestamp_gte: $since, timestamp_lt: $until }
  { to:   $address, timestamp_gte: $since, timestamp_lt: $until }
] }

# rejected
where: { timestamp_gte: $since, or: [{ from: $address }, { to: $address }] }
```

The default query in `packages/adapters/src/graph.ts` already does this. If you
write your own, do the same.

## Schema contract

`schema.graphql` is written to match the default query in
`packages/adapters/src/graph.ts`: a `transfers` collection with `transaction`,
`from`, `to`, `value`, `timestamp` and `token { symbol }`. Rename a field here
and you must pass a matching `query` through `GraphOptions`, or Purse will
silently index nothing useful.

Amounts are stored in base units and never scaled in the mapping. Scaling in
two places is how a reconciliation report ends up off by a factor of a million.

## Settling in HBAR instead

HBAR is the native asset and emits no ERC-20 `Transfer` event, so this subgraph
will not see it. Reconciliation against The Graph is therefore a token-settled
feature. With HBAR, Purse still reports analytics from its own ledger and
labels the source `ledger` rather than claiming on-chain provenance it lacks.
