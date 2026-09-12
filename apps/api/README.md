# `@pocket/api`

The decision. Everything else in this repository is a client of it.

An agent asks to buy something. This service prices the request, checks it
against the budget and policy a human set, and only if every rule passes does it
ask a custodian to sign. The answer is recorded either way.

## What it owns

| Concern         | What that means here                                                  |
| --------------- | --------------------------------------------------------------------- |
| **Policy**      | Five limits, all checked before money moves. Every one has to pass.   |
| **Payments**    | The whole x402 exchange: quote, decide, sign, present, settle.        |
| **Ledger**      | Every attempt, including the refusals, with the rule that stopped it. |
| **Audit trail** | Every action by an agent, a human, or the system. Written once.       |
| **Tenancy**     | Organizations, members and API keys.                                  |

## Run it

```bash
docker compose up -d
cp .env.example .env
pnpm db:push
pnpm --filter @pocket/api dev
```

[`api.pocket-app.xyz`](https://api.pocket-app.xyz) is the deployed one, and the
local server answers on `:8080`. Either one describes itself at `/`: every
endpoint, which vendor is answering for each adapter, and which build it is.

## The surface

`GET /` lists every endpoint this service serves, so the running API is its own
reference. The shape worth knowing before you read it:

```json
{ "amount": "0.08", "asset": "USDC" }
```

Money is always a decimal string beside its asset, never a JSON number. A JSON
number becomes a float in every client, and a ledger cannot afford that.

A refused payment is a normal `200` carrying a refusal, not an error. The agent
needs to read why it was stopped in order to do something sensible instead.

## How a request is decided

```
POST /v1/payments/x402/purchase
  → fetch the resource, read the 402 terms
  → price it, if the limit is in dollars
  → authorize: daily budget, task budget, per-transaction, recipient, category
  → ask Privy for a signature, only if allowed
  → present the payment, let the facilitator settle it
  → record the outcome
```

The order is the point. Nothing is signed before the decision, so a refusal has
no signature attached to it that a later request could replay.

## Layout

| Path             | What is in it                                                |
| ---------------- | ------------------------------------------------------------ |
| `src/routes`     | HTTP handlers, one file per resource                         |
| `src/services`   | The work behind a route: payments, settlement, pricing, x402 |
| `src/auth.ts`    | Bearer credentials, and which routes need none               |
| `src/serialize*` | The JSON shapes the contract promises                        |
| `tests`          | Integration tests against a real Postgres                    |

Domain rules live in `@pocket/core` and vendors live in `@pocket/adapters`.
Nothing in this app talks to Privy, Hedera or The Graph directly.

## Operations

```bash
pnpm --filter @pocket/api adopt -- you@example.com org_1234abcd
pnpm --filter @pocket/api provision:treasury
pnpm --filter @pocket/api provision:merchant
```

`adopt` attaches a signed-in account to an existing organization, for when
signing in created a fresh empty one. The two `provision` commands mint the
wallets a deployment needs once: the treasury that seeds new agents, and the
example seller's payee. Both print the ids to put in `.env`.

## Tests

```bash
pnpm --filter @pocket/api test
```

Needs Postgres on 5434. The suite creates and drops its own database.
