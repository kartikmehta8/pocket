# Pocket HTTP API contract

Base URL: `http://localhost:8080`. All routes under `/v1`.
Auth: `Authorization: Bearer pocket_sk_...` (organization API key) on every route
except `POST /v1/orgs` and `GET /v1/health`.

**Money is always a decimal string** (`"0.08"`), never a number, and always
travels beside its `asset`. Timestamps are ISO-8601 UTC.

## Authentication

Every route except `POST /v1/orgs`, `POST /v1/auth/session` and `GET /v1/health`
requires a bearer token. Two kinds are accepted on the same header:

| Token         | Who presents it                       | `principal` |
| ------------- | ------------------------------------- | ----------- |
| `pocket_sk_…` | An agent runtime or the MCP server    | `api-key`   |
| Anything else | A signed-in person, via the dashboard | `session`   |

An identity token is verified with the configured provider and resolved to the
organization its subject belongs to. Routes marked **session only** refuse an
API key with `403`: a leaked machine credential must not be able to mint more
credentials for itself or rename the organization it is confined to.

`POST /v1/auth/session` is what creates the mapping. Presenting a valid identity
token that has never signed in returns `401` on every other route — the browser
is expected to establish the session first.

Privy's identity token, when forwarded as `x-identity-token`, supplies the email
address used to name a newly created organization. It is optional; without it
the organization gets a generic name.

## Errors

Every failure returns the same envelope with the documented HTTP status:

```json
{ "error": { "code": "TASK_BUDGET_EXCEEDED", "message": "...", "details": {} } }
```

## Shapes

```ts
type Outcome = 'allow' | 'require_approval' | 'deny';
type PaymentStatus =
  'blocked' | 'awaiting_approval' | 'approved' | 'submitted' | 'settled' | 'failed';
type AgentStatus = 'active' | 'paused' | 'revoked';
type Category =
  'research' | 'inference' | 'data' | 'compute' | 'storage' | 'api' | 'agent-service' | 'other';

interface Violation {
  code: string;
  message: string;
  details?: Record<string, string>;
}

/** How one adapter slot resolved. `live` is stated, never inferred from the name. */
interface AdapterMode {
  provider: string;
  live: boolean;
}

interface Decision {
  outcome: Outcome;
  violations: Violation[];
  approvalReasons: string[];
  asset: string;
  headroom: {
    dailyRemaining: string;
    dailyRemainingAfter: string;
    taskRemaining: string | null;
    taskRemainingAfter: string | null;
  };
}

interface AgentSummary {
  id: string;
  name: string;
  description: string | null;
  status: AgentStatus;
  createdAt: string;
  wallet: { address: string; chain: string } | null;
  budget: { asset: string; dailyLimit: string; perTransactionLimit: string } | null;
  spend: { today: string; dailyRemaining: string; paymentCount: number };
}

interface Payment {
  id: string;
  agentId: string;
  agentName: string;
  amount: string;
  asset: string;
  chain: string;
  recipient: string;
  category: Category;
  reason: string;
  resource: string | null;
  initiatedBy: 'agent' | 'human';
  status: PaymentStatus;
  denialCode: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  taskBudgetId: string | null;
  createdAt: string;
  settledAt: string | null;
}

interface Policy {
  allowedAssets: string[];
  allowedChains: string[];
  allowedCategories: Category[];
  maxTransactionAmount: string;
  trustedRecipients: string[];
  unknownRecipientBehaviour: 'block' | 'require_approval' | 'allow';
  approvalThreshold: string | null;
}

interface TaskBudget {
  id: string;
  agentId: string;
  label: string;
  asset: string;
  limit: string;
  spent: string;
  remaining: string;
  closedAt: string | null;
  createdAt: string;
}

/** On-chain balance. `null` when the chain read failed: unknown, not zero. */
interface Balance {
  asset: string;
  amount: string;
}

interface AuditEvent {
  id: string;
  actorType: 'agent' | 'human' | 'system';
  actorId: string | null;
  action: string;
  subjectType: string;
  subjectId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}
```

## Routes

| Method | Path                                       | Body                                                              | Returns                                                                                                   |
| ------ | ------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| POST   | `/v1/auth/session`                         | `{ orgName? }` + identity token as bearer                         | `{ org, user, provisioned }` — `201` when it created the tenant. Mints no key; the operator creates one   |
| POST   | `/v1/orgs`                                 | `{ name }`                                                        | `{ org, apiKey }` — key shown once. The only path that mints one, having no session to mint from          |
| GET    | `/v1/orgs/me`                              |                                                                   | `{ org, user, principal }`                                                                                |
| PATCH  | `/v1/orgs/me`                              | `{ name }`                                                        | `{ org }` — session only                                                                                  |
| GET    | `/v1/api-keys`                             |                                                                   | `{ keys: ApiKey[] }` — session only, never a secret                                                       |
| POST   | `/v1/api-keys`                             | `{ label }`                                                       | `{ key, apiKey }` — session only, key shown once                                                          |
| DELETE | `/v1/api-keys/:id`                         |                                                                   | `{ key }` — session only; `404` if unknown, `400` if it is the last live one                              |
| GET    | `/v1/health`                               |                                                                   | `{ ok, adapters: { wallet, chain, analytics, market, identity }, chain }`                                 |
| POST   | `/v1/agents`                               | `{ name, description?, metadata? }`                               | `{ agent, wallet }`                                                                                       |
| GET    | `/v1/agents`                               |                                                                   | `{ agents: AgentSummary[] }`                                                                              |
| GET    | `/v1/agents/:id`                           |                                                                   | `{ agent, policy \| null, taskBudgets, balance \| null, accountId \| null }`                              |
| PATCH  | `/v1/agents/:id`                           | `{ status?, description?, metadata? }`                            | `{ agent }`                                                                                               |
| PUT    | `/v1/agents/:id/budget`                    | `{ asset, dailyLimit, perTransactionLimit }`                      | `{ budget }`                                                                                              |
| PUT    | `/v1/agents/:id/policy`                    | Policy; `approvalThreshold` may be null or absent                 | `{ policy }`                                                                                              |
| POST   | `/v1/agents/:id/task-budgets`              | `{ label, asset, limit }`                                         | `{ taskBudget }`                                                                                          |
| GET    | `/v1/agents/:id/task-budgets`              |                                                                   | `{ taskBudgets: TaskBudget[] }`                                                                           |
| POST   | `/v1/task-budgets/:id/close`               |                                                                   | `{ taskBudget }`                                                                                          |
| POST   | `/v1/payments/x402/purchase`               | `{ agentId, url, reason, category?, taskBudgetId?, purchaseId? }` | `{ status, ... }` — the whole x402 exchange, server-side                                                  |
| POST   | `/v1/payments/preview`                     | PaymentRequest                                                    | `{ decision }`                                                                                            |
| POST   | `/v1/payments`                             | PaymentRequest + `Idempotency-Key` header                         | `{ payment, decision }`                                                                                   |
| GET    | `/v1/payments?agentId&status&limit`        |                                                                   | `{ payments: Payment[] }`                                                                                 |
| GET    | `/v1/payments/:id`                         |                                                                   | `{ payment }`                                                                                             |
| POST   | `/v1/payments/:id/approve`                 | `{ note? }`                                                       | `{ payment }`                                                                                             |
| POST   | `/v1/payments/:id/reject`                  | `{ note? }`                                                       | `{ payment }`                                                                                             |
| GET    | `/v1/analytics/spend?agentId&days=7`       |                                                                   | SpendSummary                                                                                              |
| GET    | `/v1/analytics/timeseries?agentId&days=14` |                                                                   | `{ asset, points: [{ date, amount, count }] }`                                                            |
| GET    | `/v1/payments/stats?agentId&days=7`        |                                                                   | `{ days, total, settled, submitted, blocked, awaitingApproval, failed }` — real counts, not a capped page |
| GET    | `/v1/audit?limit=50&cursor`                |                                                                   | `{ events: AuditEvent[], nextCursor }`                                                                    |

### `POST /v1/payments/x402/purchase`

Fetches a URL, and if it answers `402` with terms Pocket can settle, runs the
whole exchange: policy decision, signature, presentation, settlement. The
caller never holds a signed payload, so it cannot route around the policy
engine even if it could reach the seller itself.

`status` is one of:

| `status`  | Means                                                         | Also carries                           |
| --------- | ------------------------------------------------------------- | -------------------------------------- |
| `free`    | The seller charged nothing                                    | `result`                               |
| `paid`    | Settled, and the data came back                               | `result`, `payment`, `settlement`      |
| `blocked` | Policy refused it, or held it for a human. Nothing was signed | `payment`, `decision`, `requirement`   |
| `failed`  | Reachable but the purchase did not complete                   | `message`, `code`, sometimes `payment` |

A `blocked` result is a `200`, not an error. It is the product working, and the
`decision` carries the violations and the remaining headroom so the caller can
choose a cheaper provider rather than retrying blindly.

The API fetches a URL the caller chose, so private and loopback destinations
are refused unless `ALLOW_PRIVATE_RESOURCE_HOSTS=true`. That defaults to on
outside production, because the example seller runs on `localhost`.

`PaymentRequest`:

```json
{
  "agentId": "agent_...",
  "amount": "0.08",
  "asset": "USDC",
  "chain": "hedera-testnet",
  "recipient": "0x...",
  "category": "research",
  "reason": "Market intelligence for ETH ecosystem research",
  "taskBudgetId": "task_...",
  "initiatedBy": "agent",
  "resource": "https://..."
}
```

`SpendSummary`:

```json
{
  "periodSpend": "8.42",
  "currency": "USDC",
  "previousPeriodSpend": "2.31",
  "increasePercent": 264.5,
  "largestCategory": "research",
  "byCategory": [{ "category": "research", "amount": "5.10", "count": 12 }],
  "byRecipient": [{ "address": "0x...", "amount": "3.20", "count": 8 }],
  "anomalies": [{ "type": "spend_spike", "severity": "medium", "description": "..." }],
  "source": "the-graph"
}
```
