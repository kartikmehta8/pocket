# Setup

Pocket runs with **no keys at all**. Every vendor slot falls back to a
deterministic in-memory implementation, and `GET /v1/health` reports exactly
which mode each one resolved to:

```json
{
  "adapters": {
    "wallet": { "provider": "mock", "live": false },
    "chain": { "provider": "mock", "live": false },
    "analytics": { "provider": "ledger", "live": false }
  }
}
```

The dashboard sidebar shows the same three badges. A slot only reads **Live**
when the real vendor is wired, so an offline demo can never pass itself off as
a settled one.

## One slot at a time

Each guide below is independent. Turning on Privy does not require Hedera, and
neither requires The Graph.

| Guide                     | What it turns on                                    |
| ------------------------- | --------------------------------------------------- |
| [Privy](privy.md)         | Agent wallets, signing, and operator sign-in        |
| [Hedera](hedera.md)       | Real settlement, balance reads and explorer links   |
| [The Graph](the-graph.md) | USD-priced policy ceilings and spend reconciliation |

Every value goes in `.env` at the repo root. Restart the API afterwards
(`./run-dev.sh`), because adapters are chosen once at startup.

---

## Service wallets

Two wallets belong to the deployment rather than to any agent, and both are
minted once through the same Privy application:

```bash
pnpm --filter @pocket/api provision:treasury
pnpm --filter @pocket/api provision:merchant
```

The **treasury** funds every newly registered agent with a little USDC, so an
operator can finish the setup guide without first visiting a third-party faucet.
The **merchant** is the example seller's payee; it does not belong in Pocket's
agent table, because the seller is an independent business.

Each command prints the ids to paste into `.env`:

```bash
TREASURY_WALLET_ID=
TREASURY_ADDRESS=
AGENT_SEED_AMOUNT=0.02
MERCHANT_PRIVY_WALLET_ID=
```

Leave `TREASURY_WALLET_ID` empty to turn seeding off. New agents then arrive
with an empty wallet and the faucets in the dashboard are the only way to fund
them.

The treasury needs HBAR of its own. It pays the fee on every seeding transfer,
which is an ordinary EVM call rather than an x402 settlement, so nothing else
covers it.

---

## Organization API key

This one is not a vendor key. Pocket mints it, and it authenticates every API
call.

Signing in creates your organization. **Settings → API keys** is where you mint
the first key and every one after it, and the key is shown once: only a SHA-256
hash is stored, so a lost one cannot be recovered.

Signing in mints nothing on your behalf. A credential you were never shown is
one nobody is accountable for.

The MCP server holds no key of its own. Every caller sends its own in an
`Authorization: Bearer` header, which is what keeps the hosted endpoint from
being an open door onto somebody else's agents.

`POCKET_API_KEY` in the dashboard environment is the single-tenant escape
hatch — it bypasses sign-in and pins the dashboard to one organization, which
is right for an offline demo and wrong for anything else.

Already have an organization with data in it? Sign in, then attach your account
to it:

```bash
pnpm --filter @pocket/api adopt -- you@example.com org_1234abcd
```

---

## Safety notes

- `.env` is gitignored. Keep it that way; the repo has no other secret store.
- Pocket never logs an authorization header, an idempotency key, a cookie, or a
  wallet secret. If you add logging, preserve the redaction list in
  `apps/api/src/server.ts`.
- `USE_MOCK_ADAPTERS=true` forces every slot to its fake regardless of the keys
  present. Useful for offline demos and required by the test suite. Health
  still reports the truth.
- The API key is a bearer credential with full authority over an organization's
  money. Treat it like a production secret even on testnet.
