# Deploying Pocket

Four processes and one database. The dashboard can go on any Node host or a
platform that runs Next.js; the API, the MCP server and the example paid
service share a single container image.

```text
Browser ──▶ Dashboard (Next.js, :3000)
                │  server-side, holds the session cookie
                ▼
Agent  ──▶ MCP server (:8081) ──▶ API (:8080) ──▶ Postgres
                                        │
                                        ├─▶ Privy      custody + sign-in
                                        ├─▶ Hedera RPC settlement
                                        └─▶ The Graph  indexing + pricing
```

Only the API talks to the database. Only the API holds vendor secrets. The
dashboard holds none — it forwards the signed-in person's token — and the MCP
server holds one organization API key.

---

## 1. Database

Any Postgres 15 or newer. Create the schema from a machine that can reach it:

```bash
DATABASE_URL=postgres://user:pass@host:5432/pocket pnpm db:push
```

Run this once per deployment and again after any release that changes the
schema. It is not run automatically at boot: a financial service should not
migrate itself while requests are in flight.

## 2. API, MCP server and paid service

One image, selected by build argument:

```bash
docker build --build-arg APP=api          -t pocket-api .
docker build --build-arg APP=mcp          -t pocket-mcp .
docker build --build-arg APP=paid-service -t pocket-paid .
```

Run the API with the full environment from `.env.example`:

```bash
docker run -d --name pocket-api -p 8080:8080 \
  -e DATABASE_URL=postgres://user:pass@host:5432/pocket \
  -e CORS_ORIGINS=https://pocket-app.xyz \
  -e PRIVY_APP_ID=... -e PRIVY_APP_SECRET=... \
  -e HEDERA_RPC_URL=https://testnet.hashio.io/api \
  pocket-api
```

`CORS_ORIGINS` must list the dashboard's public origin, comma-separated for
more than one. It is not a wildcard, and it is what stops another site driving
the API with a browser session it did not earn.

The MCP server needs `POCKET_API_URL` and `MCP_AGENT_TOKEN` — the organization
API key it presents. Mint that key from **Settings → API keys** in the
dashboard, not by hand.

## 3. Dashboard

`NEXT_PUBLIC_*` values are compiled into the browser bundle, so they are build
arguments rather than runtime environment. Everything else is read at runtime.

```bash
docker build -f apps/dashboard/Dockerfile -t pocket-dashboard \
  --build-arg NEXT_PUBLIC_PRIVY_APP_ID=your_app_id \
  --build-arg NEXT_PUBLIC_MCP_URL=https://mcp.pocket-app.xyz/mcp \
  --build-arg NEXT_PUBLIC_PAID_SERVICE_URL=https://pay.pocket-app.xyz \
  .

docker run -d -p 127.0.0.1:3000:3000 \
  -e POCKET_API_URL=http://pocket-api:8080 \
  pocket-dashboard
```

The API address is internal on purpose. `lib/http.ts` and `lib/marketplace.ts`
are both `import 'server-only'`, so the browser never calls the API: the
dashboard's own server does. The API needs no public hostname and no
certificate. Every published port binds to `127.0.0.1` for the same reason —
the proxy is the only way in.

**Leave `POCKET_API_KEY` unset.** Setting it puts the dashboard into
single-tenant mode: sign-in is bypassed and every visitor sees the same
organization. That is only ever right for a local demo.

### On Vercel or a similar platform

Point the project at `apps/dashboard`, set the same four variables in the
project settings, and deploy. `output: 'standalone'` is harmless there.

## 4. Documentation site

Same shape as the dashboard, on port 3001:

```bash
docker build -f apps/docs/Dockerfile -t pocket-docs \
  --build-arg NEXT_PUBLIC_APP_URL=https://pocket-app.xyz \
  .

docker run -d -p 127.0.0.1:3001:3001 pocket-docs
```

## 5. Privy configuration

In the [Privy dashboard](https://dashboard.privy.io), one application serves
both purposes: it custodies agent wallets and it authenticates operators.

1. **Settings → Basics → Allowed domains.** Add the dashboard's public origin.
   Sign-in fails silently without it — the modal opens and never completes.
2. **Login methods.** Enable email, Google, GitHub and wallet, or narrow the
   `loginMethods` array in `apps/dashboard/app/providers.tsx` to match what you
   enabled. Offering a method the application has not enabled is a dead button.
3. **App secret.** Server-side only. It goes to the API, never to the dashboard.

## 6. First sign-in

Visiting the dashboard and signing in creates an organization and its first API
key. The key is shown once, on that response, and is never recoverable.

If you already have an organization with data in it — from `pnpm seed`, or from
an earlier deployment — sign in first, then attach your account to it:

```bash
pnpm --filter @pocket/api adopt -- you@example.com org_1234abcd
```

## 7. Health

`GET /v1/health` reports which adapter resolved for each slot and whether it is
live. A slot reporting a fallback is doing something deterministic and local,
which is correct for a demo and wrong for production:

| Slot        | Live means                | Fallback means                         |
| ----------- | ------------------------- | -------------------------------------- |
| `wallet`    | Privy custodies and signs | In-memory wallets, no real money       |
| `chain`     | Hedera RPC                | Simulated balances and receipts        |
| `analytics` | A Graph subgraph          | Spend read from the local database     |
| `market`    | Composed Graph pricing    | Unpriced — a USD policy ceiling denies |
| `identity`  | Privy verifies sign-ins   | **Any token is accepted. Local only.** |

The last row matters most. `identity: offline` means the API will trust any
bearer token that is not an API key. Never expose that to a network.
