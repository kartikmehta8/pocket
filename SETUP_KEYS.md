# Adding keys: Privy, Hedera and The Graph

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

Add keys one slot at a time. Each section below is independent: turning on
Privy does not require Hedera, and neither requires The Graph.

Every value goes in `.env` at the repo root. Restart the API afterwards
(`./run-dev.sh`), because adapters are chosen once at startup.

---

## 1. Privy — wallets and signing

Privy custodies the agent wallets. Pocket never holds a private key.

1. Sign in at **https://dashboard.privy.io** and create an app.
2. Open **Settings → Basics**. Copy the **App ID**.
3. On the same page, under **App secret**, click **Reveal** and copy it. It is
   shown once.
4. Fill in:

```bash
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-app-secret
```

That is everything Pocket needs. There is **no server-wallet toggle to switch
on**: the Wallet API is available to any app, and the App ID plus App Secret
are the only credentials required to create a wallet. If you were looking for
such a setting and could not find one, that is why.

Pocket creates **app-owned** wallets, meaning it passes no `owner` when calling
`createWallet`. That matters for the next step.

### Sign-in uses the same app

The dashboard signs operators in with Privy too, so there is no second set of
credentials. Two more things are needed for that half:

1. **Settings → Basics → Allowed domains.** Add every origin the dashboard is
   served from, including `http://localhost:3000` for local work. Without it the
   login modal opens and never completes, with no error in the console.
2. Put the **App ID** — not the secret — in the dashboard environment:

```bash
# apps/dashboard/.env.local
NEXT_PUBLIC_PRIVY_APP_ID=your-app-id
POCKET_API_KEY=                     # empty: setting it bypasses sign-in
```

The App ID is a public identifier and is compiled into the browser bundle. The
App Secret never leaves the API.

### Authorization key — optional

Privy only _requires_ a request signature when a wallet has an owner. Pocket's
wallets have none, so this step is genuinely optional and you can skip it and
still transact. Add it if you want wallet actions cryptographically bound to a
key your server holds.

1. In the Dashboard, open the **Wallets** section and choose the
   **Authorization keys** page. Direct link:
   **https://dashboard.privy.io/apps?page=authorization-keys**
2. Click **New key**, top right. Optionally give it a name.
3. Privy generates the pair, keeps the public half in its secure enclave, and
   shows you the **private key once**. Copy it now. Privy does not store it and
   cannot recover it for you.
4. Paste it whole, including the `wallet-auth:` prefix:

```bash
PRIVY_AUTHORIZATION_PRIVATE_KEY=wallet-auth:MIGHAgEAMBMGByqGSM49AgEGCCqGSM49...
```

The value is base64-encoded DER with no PEM header or footer. The server SDK
strips the `wallet-auth:` prefix itself, so pasting it with or without the
prefix both work. Keep the prefix: it makes the value self-describing in a
secrets manager.

Leave the variable blank if you skipped this.

**Check it worked.** Restart, then:

```bash
curl -s localhost:8080/v1/health | jq .adapters.wallet
# { "provider": "privy", "live": true }
```

Register an agent and a real Privy wallet address comes back:

```bash
curl -sX POST localhost:8080/v1/agents \
  -H "authorization: Bearer $POCKET_API_KEY" \
  -H 'content-type: application/json' \
  -d '{"name":"Hermes"}' | jq .wallet
```

On first wallet creation Pocket also installs a **Privy-side policy** capping
native transfer value, as a second ceiling underneath its own policy engine. If
Privy rejects that call, wallet creation still succeeds and a warning is
printed: Pocket's policy engine remains authoritative and always runs.

---

## 2. Hedera — settlement and balance reads

Pocket talks to Hedera through its Ethereum-compatible JSON-RPC relay, so this
is ordinary EVM wiring: chain id 296 on testnet, `0x` addresses, `eth_call`.

### `HEDERA_RPC_URL`

This is a public endpoint, not a key. Nothing to sign up for:

```bash
HEDERA_RPC_URL=https://testnet.hashio.io/api
CHAIN=hedera-testnet
```

Hashio is Hashgraph's free relay and is explicitly **for development and
testing only**; it is rate limited. For anything sustained, use a commercial
relay (Hgraph, Validation Cloud, QuickNode) or self-host the
[Hiero JSON-RPC Relay](https://github.com/hiero-ledger/hiero-json-rpc-relay).
Those providers put the key inside the URL, so it still goes in this one
variable and there is no separate key setting.

Confirm the endpoint answers with the chain you expect:

```bash
curl -s -X POST https://testnet.hashio.io/api \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# {"result":"0x128"}   0x128 = 296 = Hedera testnet
```

Mainnet is `https://mainnet.hashio.io/api`, chain id 295.

You also want a funded testnet account of your own for the faucet and for
HashScan: create one at **https://portal.hedera.com/dashboard**.

### `HEDERA_USDC_ADDRESS`

**Leave this blank unless you specifically want USDC.** Blank means Pocket
settles in HBAR, the native asset, which needs no contract address and no
setup. For a demo that is the path of least resistance. If it is blank and an
agent tries to pay in USDC, the payment fails with `VALIDATION_FAILED` rather
than guessing an address.

If you do want USDC, the value is Circle's testnet USDC, expressed as an EVM
address:

```bash
HEDERA_USDC_ADDRESS=0x0000000000000000000000000000000000068cda
```

That is Hedera token `0.0.429274`. Hedera tokens have two names for the same
thing: a native token id and an EVM address that is just the token number in
hex, left-padded to 20 bytes. `429274` is `0x68cda`, hence the address above.

To derive it for any other token:

```bash
python3 -c "print('0x' + format(429274, '040x'))"
```

Verify any address before trusting it, by asking the token itself:

```bash
curl -s -X POST https://testnet.hashio.io/api -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0x0000000000000000000000000000000000068cda","data":"0x95d89b41"},"latest"]}'
# decodes to "USDC";  swap data for 0x313ce567 to get decimals (6)
```

Or read the token record straight from the mirror node:

```bash
curl -s https://testnet.mirrornode.hedera.com/api/v1/tokens/0.0.429274
```

The decimals it reports **must** match `ASSET_SPECS` in
`packages/core/src/assets.ts`, which says USDC has 6. A mismatch is a money bug,
not a display bug.

> **The Hedera gotcha that will bite you.** Unlike other EVM chains, an account
> cannot receive a token it is not _associated_ with. A fresh Privy wallet has
> no association with USDC, so sending it USDC fails until the wallet either
> associates with the token or has spare auto-association slots. HBAR has no
> such requirement. This is the main reason to run the demo in HBAR and treat
> USDC as a later step.

### Fund the wallets

Agents spend from their own Privy wallet, so send testnet HBAR to the address
returned when you registered the agent:

```bash
curl -s localhost:8080/v1/agents -H "authorization: Bearer $POCKET_API_KEY" \
  | jq -r '.agents[].wallet.address'
```

Then point the paid service at an address you control, so you can watch the
money arrive:

```bash
PAID_SERVICE_ADDRESS=0xYourReceivingAddress
```

**Check it worked.**

```bash
curl -s localhost:8080/v1/health | jq .adapters.chain
# { "provider": "hedera", "live": true }

curl -s localhost:8402/health | jq .verification
# "on-chain"
```

`on-chain` means the seller now verifies each payment by reading the
transaction itself, instead of trusting the proof. Buy something and the
payment record carries a real HashScan link:

```bash
curl -s "localhost:8080/v1/payments?limit=1" \
  -H "authorization: Bearer $POCKET_API_KEY" | jq '.payments[0].explorerUrl'
```

Mainnet works the same way: set `CHAIN=hedera-mainnet`,
`HEDERA_MAINNET_RPC_URL` and `HEDERA_MAINNET_USDC_ADDRESS`. Do not point this
at mainnet with real funds until you have watched the policy engine block
something on testnet.

---

## 3. The Graph — composed market data and spend intelligence

The Graph does two separate jobs in Pocket, and only one of them needs keys.

### 3a. Price-gated policy (needs two credentials)

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

### 3b. Spend reconciliation (no keys, self-hosted)

Separately, Pocket compares its own ledger against what actually settled on
chain. **The Graph does not support Hedera**: it is absent from
[the supported networks](https://thegraph.com/docs/en/supported-networks/), and
Hedera's own docs say the hosted service is unavailable and you must run a
local Graph Node. So there is no URL to paste and no key to obtain here.

This repository ships that indexer in [`subgraph/`](subgraph/README.md):

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

**Check it worked.**

```bash
curl -s localhost:8080/v1/health | jq '.adapters.analytics, .adapters.market'
```

---

## Organization API key

This one is not a vendor key. Pocket mints it, and it authenticates every API
call.

```bash
pnpm seed          # prints the key once, then never again
```

Keep it: it is what you present to the MCP server, and to the API directly.
Only a SHA-256 hash is stored, so a lost key cannot be recovered.

The MCP server holds no key of its own. Every caller sends its own in an
`Authorization: Bearer` header, which is what keeps the hosted endpoint from
being an open door onto somebody else's agents.

Once sign-in is configured you do not need `pnpm seed` at all: signing in mints
the organization's first key, and **Settings → API keys** mints and revokes the
rest. `POCKET_API_KEY` in the dashboard environment is the single-tenant escape
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
