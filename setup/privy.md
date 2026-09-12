# Privy — wallets and signing

Privy custodies the agent wallets. Pocket never holds a private key.

Part of [setup](README.md). Independent of [Hedera](hedera.md) and
[The Graph](the-graph.md).

## Credentials

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
`createWallet`. That matters for the authorization key below.

## Sign-in uses the same app

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

## Authorization key — optional

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

## Check it worked

Restart, then:

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

Next: [Hedera](hedera.md), so those wallets settle against a real chain.
