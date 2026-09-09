# Where each dependency lives

Every third-party dependency and the one file that declares it. Nothing is
installed at the workspace root except tooling.

## Hedera

| Package             | Declared in                      | Why                                                                              |
| ------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| `@hiero-ledger/sdk` | `packages/adapters/package.json` | Builds and signs native Hedera transactions in the x402 flow.                    |
| `ethers`            | `packages/adapters/package.json` | EVM reads over the Hedera JSON-RPC relay, and keccak-256 for the signing bridge. |
| `@x402/hedera`      | `packages/adapters/package.json` | The Hedera `exact` scheme, its constants, and the facilitator verifier.          |
| `@x402/hedera`      | `apps/paid-service/package.json` | The server half of the same scheme, used by the seller.                          |

The Hedera **code** lives in four files, all inside `packages/adapters/src`:

- `chains.ts` — chain ids, CAIP-2 identifiers, relay URLs, HIP-719 selectors, token id to EVM address conversion.
- `hedera.ts` — balance reads, receipt confirmation, association checks, explorer links.
- `privy-hedera-signer.ts` — the Privy-custodied signer that satisfies `ClientHederaSigner`.
- `privy-transactions.ts` — transfer and association transaction construction.

Nothing outside `packages/adapters` imports a Hedera SDK. The rest of the
system talks to the ports in `packages/core/src/ports.ts`.

## x402

| Package         | Declared in                                                        |
| --------------- | ------------------------------------------------------------------ |
| `@x402/core`    | `packages/adapters/package.json`, `apps/paid-service/package.json` |
| `@x402/fastify` | `apps/paid-service/package.json`                                   |

The buyer needs no x402 package: it reads the `payment-required` header,
delegates the decision and signing to the Purse API, and presents the result.

## Privy

One Privy application serves two purposes: it custodies the agents' wallets and
it authenticates the people who sign in to the dashboard. The server SDK does
both halves; the React SDK only opens the hosted login modal.

| Package                 | Declared in                      | Why                                                                  |
| ----------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `@privy-io/server-auth` | `packages/adapters/package.json` | Wallet custody, signing, and verifying dashboard session tokens.     |
| `@privy-io/react-auth`  | `apps/dashboard/package.json`    | The hosted sign-in modal and the browser's copy of the access token. |

The Privy **code** lives in four files inside `packages/adapters/src`:

- `privy.ts` — wallet provisioning, transfers, association, digest signing.
- `privy-policy.ts` — the provider-side spending ceiling installed on each wallet.
- `privy-identity.ts` — session token verification for the dashboard.
- `privy-hedera-signer.ts` — the bridge that lets a Privy key sign for Hedera.

The App Secret is only ever read by the API process. The dashboard receives the
App ID, which is a public identifier compiled into the browser bundle.

## The Graph

| Package                    | Declared in             | Why                                   |
| -------------------------- | ----------------------- | ------------------------------------- |
| `@graphprotocol/graph-cli` | `subgraph/package.json` | Builds and deploys the subgraph.      |
| `@graphprotocol/graph-ts`  | `subgraph/package.json` | AssemblyScript types for the mapping. |

The Graph is otherwise reached over plain HTTP, so the gateway and Token API
clients in `packages/adapters/src/graph.ts` and `graph-market.ts` need no SDK.

## Everything else

| Package                                               | Declared in                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `fastify`, `@fastify/*`, `pino`                       | `apps/api/package.json`, `apps/paid-service/package.json`    |
| `drizzle-orm`, `pg`                                   | `packages/db/package.json`                                   |
| `zod`                                                 | `packages/core`, `apps/api`, `apps/mcp`, `apps/paid-service` |
| `@modelcontextprotocol/sdk`, `express`                | `apps/mcp/package.json`                                      |
| `next`, `react`, `motion`, `recharts`, `lucide-react` | `apps/dashboard/package.json`                                |
| `typescript`, `eslint`, `prettier`, `vitest`, `tsx`   | root `package.json`                                          |

## Checking it yourself

```bash
# Every Hedera, x402, Privy or Graph dependency, and the file declaring it
for f in packages/*/package.json apps/*/package.json subgraph/package.json; do
  echo "$f"; grep -E 'hedera|hiero|x402|privy|graphprotocol|ethers' "$f"
done
```
