<div align="center">

# Pocket

**Spending limits for AI agents.**

Give each agent its own wallet and a hard cap it cannot raise.

[Documentation](https://docs.pocket-app.xyz/docs) ·
[Quickstart](https://docs.pocket-app.xyz/docs/quickstart) ·
[How it works](https://docs.pocket-app.xyz/docs/how-it-works)

<img src="apps/docs/public/screens/overview.png" alt="The Pocket dashboard: seven days of spend, today's figures against the daily ceiling, spend by category, and every payment attempt including the refusals." width="900">

</div>

---

An agent asks for a paid resource. The seller answers `402 Payment Required`.
Pocket decides whether that money may be spent, and only then does a wallet
sign for it. The agent never holds a key, and a refusal is recorded with the
rule that stopped it.

## Where everything lives

| Service          | Local                        | What it is                                                 |
| ---------------- | ---------------------------- | ---------------------------------------------------------- |
| **Dashboard**    | `http://localhost:3000`      | Where a human sets budgets and reads the record            |
| **Docs**         | `http://localhost:3001/docs` | The documentation site                                     |
| **API**          | `http://localhost:8080`      | The policy engine, ledger and audit trail                  |
| **MCP server**   | `http://localhost:8081/mcp`  | How an agent reaches Pocket, over Model Context Protocol   |
| **Paid service** | `http://localhost:8402`      | An independent x402 seller, so the demo is a real purchase |

Every service answers `GET /` with a JSON description of itself: what it does,
which build is running, and — for the MCP server and the seller — its tools and
its priced endpoints.

## Getting started

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:push
./run-dev.sh
pnpm dev:dashboard
```

Then open `http://localhost:3000` and sign in. Your organization, its first API
key and an agent with a funded wallet all come from the setup guide on screen.

Running it against real Privy, Hedera and The Graph credentials is
[`setup/`](setup/README.md) — one guide per vendor, each independent of the
other two.

## The repository

| Path                | What is in it                                              |
| ------------------- | ---------------------------------------------------------- |
| `apps/api`          | HTTP API — policy decisions, payments, audit trail         |
| `apps/dashboard`    | Next.js dashboard and the marketing page                   |
| `apps/docs`         | The documentation site                                     |
| `apps/mcp`          | MCP server, eight tools, one of which can spend            |
| `apps/paid-service` | The example x402 seller                                    |
| `packages/core`     | Pure domain logic — money, budgets, policy decisions       |
| `packages/db`       | Schema and repositories                                    |
| `packages/adapters` | Privy, Hedera and The Graph, behind ports                  |
| `subgraph`          | The indexer that reads settled payments back off the chain |
| `setup`             | Wiring Privy, Hedera and The Graph to real credentials     |

Each app carries its own README.

`API_CONTRACT.md` is the source of truth for the HTTP surface: every endpoint,
every error code, and the rule that money is always a decimal string beside its
asset and never a JSON number.

## Contributing and security

[CONTRIBUTING.md](CONTRIBUTING.md) covers the workflow and what CI will check.
[SECURITY.md](SECURITY.md) covers reporting a vulnerability — please do not open
a public issue for one.

## Licence

[Business Source License 1.1](LICENSE). Read it, run it, change it, and use it
internally. You may not offer it to third parties as a hosted or managed
service. It converts to Apache-2.0 on 2030-09-12.
