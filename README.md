# Purse

**Spending limits for AI agents.**

Give each agent its own wallet and a hard cap it cannot raise.

An agent asks for a paid resource. The seller answers `402 Payment Required`.
Purse decides whether that money may be spent, and only if it may does the
payment happen and the data come back. The agent never touches a key, and never
learns whether it was allowed until Purse has already decided.

---

## Quick start

Nothing here needs a vendor key. Every adapter falls back to a deterministic
in-memory implementation, and the health endpoint reports which mode each one
resolved to.

```bash
pnpm install
docker compose up -d           # Postgres on 5434
cp .env.example .env
pnpm db:push                   # create the schema
pnpm seed                      # prints an API key ONCE - copy it into .env
./run-dev.sh                   # API + MCP + paid service
pnpm dev:dashboard             # http://localhost:3000
```

`pnpm seed` prints an organization API key. Paste it into `.env` as
`MCP_AGENT_TOKEN`, then restart. Only its hash is stored, so it cannot be
recovered later.

### Signing in

The dashboard is multi-tenant. Set `NEXT_PUBLIC_PRIVY_APP_ID` in
`apps/dashboard/.env.local`, leave `PURSE_API_KEY` **empty**, and open
`http://localhost:3000`. Signing in creates your organization, its first API
key, and drops you on a five-step setup page that ends with an agent that has
paid for something.

Add `http://localhost:3000` to your Privy application's allowed domains first,
or the login modal opens and never completes.

Setting `PURSE_API_KEY` instead bypasses sign-in entirely and pins the dashboard
to one organization. That is the offline demo mode, not a deployment.

To wire real Privy, Hedera and The Graph credentials, see
**[SETUP_KEYS.md](SETUP_KEYS.md)**. To host it, see **[DEPLOY.md](DEPLOY.md)**.

## Run the demo

With the stack up, one command drives the whole scenario through the MCP server:

```bash
./scripts/demo.sh
```

```text
--- /v1/market/prices ---
  PAID       0.01 USDC
  data       {"quotes": [{"symbol": "ETH", "priceUsd": 2484.13, ...
  explorer   https://hashscan.io/testnet/transaction/0.0.7162784@1788896248...

--- /v1/research/deep-dive ---
  BLOCKED    TASK_BUDGET_EXCEEDED
  reason     Payment would exceed the task budget.
  headroom   task 0.39 / daily 19.46
```

The agent buys what its task budget can afford and is refused what it cannot,
and it is told the headroom that is left, so it can pick a cheaper provider
instead of retrying blindly. Both attempts appear in the dashboard and in the
audit trail: a blocked payment is a record, not a discarded event.

### What it is actually buying

The seller is not serving canned JSON. Every feed is fetched live from an
upstream a developer would otherwise pay a provider for:

| Resource                 | Price | Data from                                                  |
| ------------------------ | ----- | ---------------------------------------------------------- |
| `/v1/market/prices`      | 0.01  | CoinGecko — spot price, market cap, 24h change             |
| `/v1/network/gas`        | 0.02  | Public Ethereum node — gas price, base fee, block fullness |
| `/v1/defi/chains`        | 0.05  | DefiLlama — TVL for the top 25 chains                      |
| `/v1/defi/stablecoins`   | 0.08  | DefiLlama — supply and peg mechanism                       |
| `/v1/research/eth-brief` | 0.08  | All three, composed into one briefing                      |
| `/v1/research/deep-dive` | 0.75  | The brief plus the full underlying tables                  |

Feeds are warmed before the seller binds its port and refreshed on a timer, so
a paid request is never waiting on an upstream that might be down. A feed that
cannot warm is left out of the catalog entirely rather than sold and then
failed — the x402 middleware settles payment _before_ the handler runs, so
taking money for a request that might error would be taking money for nothing.

Call any single tool with `./scripts/mcp-call.sh <tool> '<json args>'`.

---

## How it fits together

```text
Agent runtime
    │  MCP over HTTP
    ▼
MCP server ──────────► Purse API ──────► Policy engine   (deny by default)
  8 tools                 8080           Budget engine   (daily, per-tx, task)
                            │            Audit trail     (append-only)
                            │
                            ├──► Privy      sign and broadcast, custody
                            ├──► Hedera     settle, confirm, explorer links
                            └──► The Graph  what actually settled on chain
                            │
                            ▼
                       PostgreSQL ──────► Dashboard (Next.js, 3000)

x402 paid service (8402) — an independent seller that states a price and
verifies payment on chain before serving.
```

## What is actually enforced

| Control                            | Where           | Behaviour                                                                               |
| ---------------------------------- | --------------- | --------------------------------------------------------------------------------------- |
| Allowed assets, chains, categories | Policy engine   | Allowlist. An unrecognised value narrows the list, never widens it.                     |
| Per-transaction ceiling            | Policy + budget | Both must agree.                                                                        |
| Daily allowance                    | Budget engine   | Resets at UTC midnight. In-flight payments reserve against it.                          |
| Task budget                        | Budget engine   | Reserved at authorization, released only on definitive failure.                         |
| Unknown recipients                 | Policy engine   | Block, escalate to a human, or allow. Only a _settled_ payment makes a recipient known. |
| Human approval                     | Policy engine   | Above a threshold, or for a stranger.                                                   |
| Provider ceiling                   | Privy policy    | A second cap Purse itself cannot exceed.                                                |
| Idempotency                        | Database        | A replay returns the original payment. A key reused for different money is refused.     |

Missing configuration denies. An agent with no policy row, or no budget row,
cannot spend at all.

## Money handling

No financial value is ever a JavaScript number.

- Amounts are `bigint` counts of an asset's smallest unit, stored as
  `numeric(78, 0)`.
- Conversion to and from decimal strings happens only at trust boundaries.
- The wire format carries decimal strings beside their asset, never numbers.
- A request that sends money as a JSON number is rejected.

## Repository layout

```text
packages/core       Pure domain: money, policy engine, budget engine, ports. No I/O.
packages/db         Drizzle schema and repositories. Tenancy and money-path invariants.
packages/adapters   Privy, Hedera, The Graph, plus deterministic fakes and the selector.
apps/api            Fastify HTTP API. Payment orchestration, settlement, analytics.
apps/mcp            Remote MCP server. Eight tools, including autonomous x402 purchase.
apps/paid-service   An x402-gated seller, independent of Purse.
apps/dashboard      Next.js dashboard. Sign-in, light mode, server components, server actions.
subgraph            Local Graph Node subgraph indexing Hedera transfers, plus its Docker stack.
Dockerfile          One image for the API, the MCP server and the paid service.
```

`API_CONTRACT.md` is the source of truth for the HTTP surface,
`DEPENDENCIES.md` lists every dependency and the one file that declares it, and
`DEPLOY.md` covers hosting.

## Commands

```bash
pnpm verify        # format check, lint, typecheck, test, build
pnpm test          # 133 tests
pnpm lint
pnpm typecheck
pnpm db:studio     # browse the database
```

`next build` and `next dev` share `apps/dashboard/.next`. If the dev server
starts throwing webpack module errors after a production build, delete that
directory and restart it.

Tests need Postgres running. They use the deterministic adapters, so no vendor
credentials and no network access are required.

## How payment actually works

Purse implements x402 v2 with the official `@x402/*` packages, settling through
a facilitator on Hedera. The seller advertises a price, the buyer presents a
signed payload, and the facilitator verifies and submits it.

Three properties are worth stating plainly.

**Purse never holds a private key.** The x402 Hedera scheme expects a signer
holding a Hedera key. Purse has none, so it implements the same interface and
delegates to Privy: the transaction body is hashed with keccak-256 and signed
by the Privy-custodied wallet, and the resulting signature verifies against the
account's Hedera public key. See `packages/adapters/src/privy-hedera-signer.ts`.

**The policy engine gates the signing.** Authorization runs before anything is
signed, so an agent cannot produce a payable transaction for a payment Purse
refused. A payment that needs a human is recorded as `awaiting_approval` and no
payload is returned at all.

**The facilitator pays gas.** The transaction id names the facilitator, so
agent wallets never need native currency to transact.

## Hedera specifics that will surprise you

An account cannot receive a token it has not **associated** with, unlike other
EVM chains. Purse handles it through HIP-719, and checks the recipient before
settling so a doomed transfer is never broadcast. See
`POST /v1/agents/:id/wallet/associate`.

Low EVM addresses map to real Hedera account numbers, so the `0x…dEaD` burn
convention does not hold. `./scripts/check-address.sh` validates any address
before you trust it.
