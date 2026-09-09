# Pocket

## Claude-Ready Execution & Implementation Plan

> **Product name:** Pocket  
> **Project type:** Agent financial infrastructure for autonomous AI agents  
> **Flagship agent:** Hermes Agent  
> **Primary tracks:** Privy + Hedera + The Graph  
> **Language:** TypeScript-first  
> **Primary goal:** Give AI agents secure wallets, programmable budgets, spending policies, x402 payments, and live financial observability.

---

## 0. Instructions for Claude

You are implementing this repository as a production-quality TypeScript monorepo.

Read this document completely before creating code.

### Non-negotiable engineering rules

1. Use TypeScript with `strict: true`.
2. Use Prettier for formatting.
3. Use ESLint with type-aware rules.
4. No production source file may exceed **200 lines**.
5. No test file should exceed **250 lines**. Split test suites when necessary.
6. Every exported module, class, type, interface, and function must have a useful TSDoc block.
7. Public functions must document:
   - purpose
   - parameters
   - return value
   - thrown errors
   - security-sensitive behavior when relevant
8. Prefer small functions under 30 lines.
9. Prefer functions with at most 4 parameters. Use typed options objects beyond that.
10. Avoid `any`. Use `unknown` at trust boundaries and validate it.
11. No dead code.
12. No commented-out code.
13. No placeholder TODOs unless they are tracked in `TODO.md` with owner, reason, and milestone.
14. No meaningless comments that repeat the code.
15. No secrets, private keys, access tokens, seed phrases, or credentials in source control.
16. Every external input must be schema validated.
17. Every financial operation must be idempotent.
18. Every money-moving operation must be auditable.
19. Never log credentials, authorization headers, wallet secrets, signatures, or raw sensitive payloads.
20. Every privileged action must pass authorization and policy checks.
21. Tests must cover success paths, failure paths, boundary cases, policy violations, and replay/idempotency.
22. Run lint, format check, typecheck, unit tests, integration tests, and build before declaring any task complete.
23. Keep architecture simple. Do not introduce abstractions before they are needed.
24. No “temporary” production code.
25. Prefer clear domain language over generic names such as `utils`, `helpers`, `manager`, or `service2`.
26. Do not make direct vendor SDK calls from controllers, routes, UI components, or MCP tool handlers. Use adapters behind domain interfaces.
27. Financial values must never use JavaScript floating-point arithmetic. Use integer base units or a decimal-safe library.
28. Timestamps must be stored in UTC.
29. IDs must be generated server-side.
30. Security decisions must be deny-by-default.
31. A failing policy engine must block a transaction, never allow it.
32. A failing audit write must block a money-moving action unless an explicit durable outbox mechanism guarantees eventual persistence.
33. Do not expose internal stack traces to clients.
34. Every HTTP and MCP error response must use typed, documented error codes.
35. No dependency should be added without a clear use case.
36. Keep the dependency graph small and regularly audit it.
37. All repository documentation must remain correct as implementation changes.

### Optional Claude skills

If the runtime provides **Ponytail** and/or **EDHD** skills, invoke them before implementation and use them to keep output concise, maintainable, and free of noisy code or comments.

If those skills are not available, do **not** stop. Follow the conventions in this document instead.

---

# 1. Product Summary

## 1.1 One-line pitch

> **Pocket gives autonomous AI agents secure programmable wallets with budgets, policies, x402 payments, and real-time onchain spending intelligence.**

Positioning:

> **Pocket is the financial control plane for autonomous agents.**

Tagline:

> **Every agent gets a pocket. You decide what is in it.**

Naming is final. Use `pocket` for the repo and the npm scope `@pocket/*`. Environment variables stay grouped by concern (`PRIVY_`, `HEDERA_`, `GRAPH_`, `MCP_`), not brand-prefixed.

---

## 1.2 Problem

Autonomous agents increasingly need to purchase:

- API calls
- inference
- blockchain data
- research
- compute
- storage
- agent-to-agent services
- digital services

Giving an AI agent an unrestricted wallet is unsafe.

A company needs answers to:

- How much can this agent spend?
- What is it allowed to buy?
- Which tokens can it use?
- Which chains can it use?
- Which recipients are trusted?
- How much has it spent today?
- Why was a payment made?
- Was the payment initiated by a human or an agent?
- Can high-risk payments require approval?
- Can an agent pay an x402 service automatically?
- Can all spending be reconstructed later?

Pocket solves this.

---

# 2. Hackathon Track Strategy

## 2.1 Privy

Use Privy as the wallet and secure transaction-control layer.

The implementation must demonstrate:

- at least one real Privy wallet
- a business/organization use case
- a functional payment or wallet-management workflow
- at least one Privy control such as policies, signers, intents, or approvals

### Load-bearing Privy use

Privy must be responsible for real wallet infrastructure, not authentication decoration.

Proposed flow:

```text
Organization
  -> Agent
      -> Privy wallet
          -> policy / signer controls
              -> transaction
```

The app maintains application-level policies on top of Privy controls.

Examples:

- agent daily limit = 20 USDC
- max single payment = 2 USDC
- allowed asset = USDC
- allowed network = configured network
- unknown recipient = block or require human approval

---

## 2.2 Hedera

Use Hedera for the autonomous x402 payment path.

The implementation must expose at least one **real x402-gated service**.

Example:

```text
GET /premium/market-intelligence
```

Without payment:

```text
HTTP 402 Payment Required
```

Hermes discovers the payment requirement and uses Pocket to authorize and pay.

After successful Hedera settlement:

```text
HTTP 200
{
  "result": ...
}
```

The demo must show:

1. Hermes requests paid resource.
2. Service returns x402 requirement.
3. Hermes calls our MCP.
4. Our policy engine evaluates the payment.
5. Payment is executed on Hedera testnet.
6. Agent retries the request.
7. Paid result is returned.
8. Spend appears in the dashboard and audit trail.

---

## 2.3 The Graph

Use The Graph as the onchain financial observability and reasoning layer.

Do not merely display raw Graph query output.

The Graph must power:

- spend history
- token flow analysis
- agent transaction history
- payment categorization
- anomaly detection inputs
- wallet-level analytics
- recipient frequency
- service payment history
- historical financial reasoning

Example Hermes prompt:

> “How much did my research agent spend this week, and is anything unusual?”

Expected behavior:

1. Hermes invokes our MCP.
2. MCP queries the analytics service.
3. Analytics service uses live data from The Graph.
4. Application aggregates spending.
5. Application compares it with historical behavior.
6. Hermes gets a structured answer with evidence.

Example:

```json
{
  "periodSpend": "8.42",
  "currency": "USDC",
  "previousPeriodSpend": "2.31",
  "increasePercent": 264.5,
  "largestCategory": "research",
  "anomalies": [
    {
      "type": "spend_spike",
      "severity": "medium",
      "description": "Research-service spending is 3.6x the trailing weekly average."
    }
  ]
}
```

---

# 3. Core Demo

## 3.1 Demo prompt

User tells Hermes:

> “Research the current ETH ecosystem using paid data sources. You may spend up to $0.50.”

### Execution

```text
User
  |
  v
Hermes Agent
  |
  | MCP
  v
Pocket MCP
  |
  +--> identity
  +--> wallet
  +--> budget
  +--> policy
  +--> spend tracking
  |
  v
Paid x402 data service
  |
  v
Hedera settlement
  |
  v
Result returned to Hermes
  |
  v
The Graph indexing / query
  |
  v
Dashboard + audit trail
```

### Expected interaction

Hermes:

```text
I need paid market intelligence.
Provider price: 0.08 USDC-equivalent.
Task budget remaining: 0.50.
Agent daily budget remaining: 18.42.
Policy: allowed.
```

Pocket:

```text
PAYMENT APPROVED
paymentId: pay_...
```

Later Hermes tries a second service:

```text
Cost: 0.75
Task budget remaining: 0.42
```

Pocket:

```text
PAYMENT BLOCKED
reason: TASK_BUDGET_EXCEEDED
```

Hermes chooses a cheaper provider.

That demonstrates actual agency plus financial controls.

---

# 4. MVP Scope

## 4.1 Must-have

### Organization

- Create organization.
- Create organization API key or secure session.
- Organization-level audit trail.

### Agent

- Register Hermes agent.
- Assign a Privy-backed wallet.
- Set agent status.
- Store metadata.

### Wallet

- Provision wallet through Privy.
- Query wallet address.
- Query balance.
- Never expose signing secret.

### Budget

- Daily budget.
- Per-transaction limit.
- Task-specific budget.
- Current spend.
- Remaining spend.

### Policy

- Allowed tokens.
- Allowed networks.
- Maximum transaction amount.
- Trusted recipients.
- Unknown-recipient behavior.
- Category restrictions.
- Approval threshold.

### Payment

- Preview.
- Policy evaluation.
- Idempotency.
- Execute.
- Record.
- Reconcile.

### x402

- One real paid endpoint.
- One real autonomous Hermes payment.
- Hedera testnet settlement.

### Graph

- Live transaction data.
- Spend summary.
- Agent activity history.
- At least one reasoning/anomaly use case.

### MCP

- Remote HTTP MCP server.
- Hermes installation instructions.
- Tool schemas.
- Typed tool outputs.
- Tool allowlist guidance.

### Dashboard

- agent
- wallet
- balance
- daily budget
- remaining budget
- spend history
- policy
- audit trail

---

## 4.2 Explicitly out of scope for MVP

Do not implement these until the core demo works:

- fiat bank accounts
- Visa/Mastercard card issuing
- KYC
- production custody
- multiple LLM frameworks
- advanced DeFi
- portfolio optimization
- swaps
- bridges
- NFTs
- mobile app
- Telegram bot
- Slack integration
- Notion integration
- Linear integration
- complex multi-chain abstraction
- production mainnet money
- custom blockchain

---

# 5. Architecture

## 5.1 High-level architecture

```text
+----------------------+
|     Hermes Agent     |
| OpenRouter / LLM     |
+----------+-----------+
           |
           | MCP over HTTP
           v
+----------------------+
| Pocket MCP            |
+----------+-----------+
           |
           v
+----------------------+
| Application API      |
| Fastify / TypeScript |
+---+-------+------+---+
    |       |      |
    |       |      +------------------+
    |       |                         |
    v       v                         v
 Policy   Budget                  Audit / DB
 Engine   Engine                  PostgreSQL
    |       |
    +---+---+
        |
        v
 Payment Orchestrator
   |             |
   v             v
 Privy        Hedera/x402
 Wallet          |
                 v
             Paid Service

The Graph
   |
   v
Analytics Adapter
   |
   v
Application API
   |
   +--> Dashboard
   +--> MCP
```

---

# 6. Recommended Technology Stack

## Runtime

- Node.js current LTS
- TypeScript
- pnpm

## Monorepo

- pnpm workspaces
- Turborepo only if needed
- Prefer plain pnpm workspace first

## Backend

- Fastify
- Zod
- Pino
- `@modelcontextprotocol/sdk`
- PostgreSQL
- Drizzle ORM or Prisma

Recommendation:

**Drizzle** for explicit SQL-friendly behavior and smaller abstraction surface.

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui where it reduces development time

Do not over-design the dashboard.

## Testing

- Vitest
- Supertest or Fastify inject
- Testcontainers for PostgreSQL integration tests where CI allows
- MSW or deterministic vendor adapter mocks
- Playwright for a small E2E suite

## Code quality

- ESLint
- typescript-eslint
- Prettier
- Husky
- lint-staged
- commitlint optional

## Security

- Helmet
- CORS allowlist
- rate limiting
- secure headers
- secret manager via environment variables for hackathon
- never persist raw vendor credentials unnecessarily

## Observability

- Pino structured logging
- request IDs
- payment correlation IDs
- OpenTelemetry optional after MVP

---

# 7. Repository Structure

```text
pocket/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   └── tests/
│   ├── dashboard/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── mcp/
│   │   ├── src/
│   │   └── tests/
│   └── paid-service/
│       ├── src/
│       └── tests/
│
├── packages/
│   ├── domain/
│   │   └── src/
│   ├── application/
│   │   └── src/
│   ├── db/
│   │   └── src/
│   ├── privy-adapter/
│   │   └── src/
│   ├── hedera-adapter/
│   │   └── src/
│   ├── graph-adapter/
│   │   └── src/
│   ├── policy-engine/
│   │   └── src/
│   ├── observability/
│   │   └── src/
│   ├── config/
│   │   └── src/
│   └── test-kit/
│       └── src/
│
├── docs/
│   ├── architecture.md
│   ├── threat-model.md
│   ├── mcp-tools.md
│   ├── payment-lifecycle.md
│   ├── local-development.md
│   ├── demo-script.md
│   └── judging.md
│
├── scripts/
├── .github/
│   └── workflows/
├── .env.example
├── eslint.config.mjs
├── prettier.config.mjs
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── TODO.md
└── LICENSE
```

---

# 8. Domain Model

## Organization

```ts
interface Organization {
  id: OrganizationId;
  name: string;
  createdAt: Date;
}
```

## Agent

```ts
interface Agent {
  id: AgentId;
  organizationId: OrganizationId;
  name: string;
  status: 'active' | 'paused' | 'revoked';
  walletId: WalletId;
  createdAt: Date;
}
```

## Wallet

```ts
interface Wallet {
  id: WalletId;
  agentId: AgentId;
  provider: 'privy';
  providerWalletId: string;
  address: string;
  network: string;
  createdAt: Date;
}
```

## Budget

```ts
interface BudgetPolicy {
  agentId: AgentId;
  dailyLimitMinor: bigint;
  singleTransactionLimitMinor: bigint;
  currency: 'USDC';
  resetTimezone: 'UTC';
}
```

## SpendingPolicy

```ts
interface SpendingPolicy {
  agentId: AgentId;
  allowedNetworks: readonly string[];
  allowedAssets: readonly string[];
  trustedRecipients: readonly string[];
  unknownRecipientAction: 'block' | 'require_approval';
  approvalThresholdMinor: bigint;
}
```

## PaymentIntent

State machine:

```text
created
  |
  v
policy_check
  |
  +--> rejected
  |
  v
approved
  |
  +--> approval_required
  |
  v
executing
  |
  +--> failed
  |
  v
submitted
  |
  v
confirmed
```

Never mutate arbitrary status values.

Implement explicit state transitions.

---

# 9. MCP Design

## 9.1 MCP principles

The MCP server is a capability boundary.

It must:

- expose only necessary tools
- return structured machine-readable data
- not leak vendor implementation details
- not expose secrets
- validate every input
- require organization/agent context
- map errors to stable error codes
- use narrow tool permissions

Hermes supports custom MCP servers with automatic tool discovery, so the server must be safe when tools are exposed to an autonomous model.

---

## 9.2 MCP tools for MVP

### `agent_get_profile`

Purpose:

Return agent identity, status, wallet address, and active financial limits.

Input:

```json
{}
```

Output:

```json
{
  "agentId": "agt_...",
  "name": "Research Agent",
  "status": "active",
  "walletAddress": "0x...",
  "network": "hedera-testnet"
}
```

---

### `wallet_get_balance`

Input:

```json
{
  "asset": "USDC"
}
```

Output:

```json
{
  "asset": "USDC",
  "balance": "18.42",
  "baseUnits": "18420000"
}
```

---

### `budget_get`

Output:

```json
{
  "dailyLimit": "20.00",
  "spentToday": "1.58",
  "remainingToday": "18.42"
}
```

---

### `payment_preview`

Input:

```json
{
  "recipient": "0x...",
  "asset": "USDC",
  "amount": "0.08",
  "purpose": "market-intelligence",
  "serviceId": "svc_market_data"
}
```

Output:

```json
{
  "allowed": true,
  "requiresApproval": false,
  "estimatedRemainingDailyBudget": "18.34",
  "policyChecks": [
    {
      "rule": "daily_limit",
      "result": "pass"
    },
    {
      "rule": "single_transaction_limit",
      "result": "pass"
    }
  ]
}
```

---

### `payment_execute`

Input:

```json
{
  "previewId": "prv_...",
  "idempotencyKey": "uuid"
}
```

Never allow arbitrary execute requests without a valid preview or prepared intent.

Output:

```json
{
  "paymentId": "pay_...",
  "status": "submitted",
  "transactionHash": "..."
}
```

---

### `spend_get_summary`

Input:

```json
{
  "range": "7d"
}
```

Output:

```json
{
  "total": "8.42",
  "currency": "USDC",
  "categories": [],
  "anomalies": []
}
```

Must use live Graph-backed data for the onchain component.

---

### `activity_list`

Return recent financial actions with safe metadata.

---

### `policy_explain`

Input:

```json
{
  "action": {
    "type": "payment",
    "recipient": "0x...",
    "asset": "USDC",
    "amount": "3.00"
  }
}
```

Output:

```json
{
  "decision": "deny",
  "reasonCode": "SINGLE_TRANSACTION_LIMIT_EXCEEDED",
  "explanation": "The configured single transaction limit is 2.00 USDC."
}
```

---

# 10. Policy Engine

The policy engine must be deterministic.

Do not call an LLM to decide whether money is allowed to move.

LLMs may explain a deterministic policy result, but never produce the authorization decision.

## Evaluation order

1. Agent active?
2. Wallet active?
3. Network allowed?
4. Asset allowed?
5. Amount positive?
6. Single transaction limit?
7. Daily budget?
8. Task budget?
9. Recipient policy?
10. Service allow/deny policy?
11. Approval threshold?
12. Replay/idempotency check?

Return all relevant policy failures, but final decision is deny if any blocking rule fails.

### Decision

```ts
type PolicyDecision =
  | {
      outcome: 'allow';
      requiresApproval: false;
      checks: readonly PolicyCheck[];
    }
  | {
      outcome: 'allow';
      requiresApproval: true;
      checks: readonly PolicyCheck[];
    }
  | {
      outcome: 'deny';
      reasonCodes: readonly PolicyReasonCode[];
      checks: readonly PolicyCheck[];
    };
```

---

# 11. Money Safety

## Never use `number`

Incorrect:

```ts
const amount = 0.1 + 0.2;
```

Correct:

```ts
type MinorUnits = bigint;
```

Store:

```text
1 USDC = 1_000_000 base units
```

Use strings at JSON boundaries.

Example:

```json
{
  "amount": "0.08"
}
```

Convert to bigint only after validation.

---

# 12. Privy Integration

Create an interface:

```ts
interface WalletProvider {
  createWallet(input: CreateWalletInput): Promise<CreatedWallet>;
  getBalance(input: BalanceInput): Promise<WalletBalance>;
  prepareTransaction(input: PrepareTransactionInput): Promise<PreparedTransaction>;
  submitTransaction(input: SubmitTransactionInput): Promise<SubmittedTransaction>;
}
```

Implementation:

```text
PrivyWalletProvider
```

No business logic inside the adapter.

The adapter only:

- maps domain commands to Privy SDK/API
- validates provider responses
- translates vendor errors
- returns domain-safe types

## Privy controls

Use at least one live Privy control supported by the selected SDK flow.

Preferred order:

1. policies
2. signers
3. intents
4. approval/quorum feature if available and practical

Document exactly which control is implemented in `docs/judging.md`.

---

# 13. Hedera + x402 Integration

## 13.1 Paid service

Create:

```text
apps/paid-service
```

Route:

```text
GET /v1/intelligence/eth
```

Response without payment:

```text
402 Payment Required
```

The service should return:

- price
- asset
- destination
- network
- payment metadata

Do not invent a private variation of x402 if a standard library or documented pattern is available.

## 13.2 Demo response

The paid service can return deterministic but useful information generated from a live public source or project-owned data.

Do not make the paid endpoint a fake static `hello world`.

Suggested payload:

```json
{
  "topic": "ethereum-ecosystem",
  "timestamp": "...",
  "signals": [
    {
      "name": "...",
      "value": "..."
    }
  ]
}
```

---

# 14. The Graph Integration

Create:

```ts
interface BlockchainAnalyticsProvider {
  getAgentTransactions(input: AgentTransactionQuery): Promise<readonly AgentTransaction[]>;
  getSpendSummary(input: SpendSummaryQuery): Promise<SpendSummary>;
}
```

Implementation:

```text
GraphBlockchainAnalyticsProvider
```

## Requirements

- live Graph provider
- no static dataset as primary source
- explicit timeout
- retry with bounded exponential backoff
- circuit-breaker behavior optional
- Graph response schema validation
- query complexity kept bounded
- secrets never sent to client
- query errors translated to domain errors

## Meaningful reasoning

Implement at least one deterministic analytics capability:

### Spend spike

```text
current period > historical average * threshold
```

### New recipient

```text
recipient has not appeared in agent history
```

### Payment frequency spike

```text
current daily payment count > trailing baseline
```

### Concentration

```text
single service receives > configured percent of spend
```

The Graph supplies data.

The application computes analysis.

Hermes reasons over the structured result.

---

# 15. Database Schema

Use PostgreSQL.

Tables:

```text
organizations
agents
wallets
budget_policies
spending_policies
trusted_recipients
services
payment_intents
payments
approvals
audit_events
idempotency_keys
task_budgets
```

## Important constraints

- foreign keys
- unique organization-scoped agent names where appropriate
- unique provider wallet ID
- unique payment idempotency key
- check constraints on non-negative monetary values
- immutable payment records after confirmation
- soft-delete only where business need exists
- audit events append-only

---

# 16. Idempotency

Money-moving APIs require an `Idempotency-Key`.

Process:

1. Validate key format.
2. Atomically reserve key.
3. Hash canonical request payload.
4. If same key + same request:
   - return previous result.
5. If same key + different request:
   - reject with `IDEMPOTENCY_CONFLICT`.
6. Persist result.
7. Never execute vendor payment twice.

Use database transaction/locking.

Do not rely on in-memory maps.

---

# 17. Audit Trail

Every security-sensitive operation emits an immutable audit event.

Events:

```text
agent.created
agent.paused
wallet.created
budget.updated
policy.updated
payment.previewed
payment.allowed
payment.denied
payment.approval_requested
payment.submitted
payment.confirmed
payment.failed
x402.challenge_received
x402.payment_completed
```

Audit event:

```ts
interface AuditEvent {
  id: AuditEventId;
  organizationId: OrganizationId;
  agentId?: AgentId;
  actorType: 'human' | 'agent' | 'system';
  actorId: string;
  eventType: AuditEventType;
  correlationId: string;
  safeMetadata: Record<string, JsonValue>;
  occurredAt: Date;
}
```

Never put:

- authorization tokens
- secrets
- seed phrases
- private keys
- full raw request headers
- vendor access tokens

inside audit metadata.

---

# 18. Security Threat Model

Create `docs/threat-model.md`.

At minimum cover:

## Prompt injection

Threat:

A paid service returns text attempting to convince Hermes to make another payment.

Control:

- agent can request payment only through MCP
- payment authorization is deterministic
- service output cannot bypass the policy engine
- task budget independently limits spend

## Wallet drain

Control:

- daily limit
- single-payment limit
- allowlisted assets
- service/recipient rules
- Privy controls
- deny-by-default behavior

## MCP tool abuse

Control:

- minimal tool set
- authenticated MCP
- organization scoping
- tool input validation
- rate limiting
- no raw signing tool
- no unrestricted transaction payload tool in MVP

## Replay

Control:

- idempotency key
- intent expiry
- payment challenge nonce
- database uniqueness

## Cross-tenant access

Control:

Every repository query includes organization scope.

Never trust organization ID supplied by the client without binding it to authenticated principal.

## SSRF

If fetching service URLs:

- restrict schemes
- block localhost
- block link-local
- block private networks
- validate redirects
- configure DNS/IP protections

Prefer a registered-service model instead of arbitrary URLs for MVP.

## Injection

- parameterized SQL
- schema validation
- never concatenate GraphQL user input into arbitrary queries
- use pre-defined Graph query documents

## Dependency attacks

- lockfile committed
- Dependabot/Renovate
- `pnpm audit`
- GitHub code scanning if available

## Secret exposure

- `.env` ignored
- `.env.example` contains names only
- CI secrets stored in secret store
- log redaction

---

# 19. Authentication and Authorization

For hackathon MVP:

- dashboard user authenticated with secure mechanism
- MCP uses a scoped agent API token
- tokens stored hashed where possible
- token includes no secret business data
- token rotation supported at application level

Recommended scopes:

```text
agent:read
wallet:read
budget:read
payment:preview
payment:execute
spend:read
```

Do not use one universal admin token.

---

# 20. Error Model

Create stable error codes.

Examples:

```text
INVALID_INPUT
UNAUTHENTICATED
FORBIDDEN
AGENT_PAUSED
WALLET_UNAVAILABLE
INSUFFICIENT_BALANCE
DAILY_BUDGET_EXCEEDED
TASK_BUDGET_EXCEEDED
SINGLE_TRANSACTION_LIMIT_EXCEEDED
ASSET_NOT_ALLOWED
NETWORK_NOT_ALLOWED
RECIPIENT_NOT_ALLOWED
APPROVAL_REQUIRED
IDEMPOTENCY_CONFLICT
PAYMENT_PROVIDER_ERROR
PAYMENT_TIMEOUT
GRAPH_PROVIDER_ERROR
X402_INVALID_CHALLENGE
```

Return safe messages.

Log internal details with correlation ID.

---

# 21. Logging

Use structured JSON logs.

Required fields:

```text
timestamp
level
service
requestId
correlationId
organizationId
agentId
event
```

Redact:

```text
authorization
cookie
set-cookie
x-api-key
privateKey
seedPhrase
signature
accessToken
refreshToken
```

Do not log complete transaction payloads if they contain sensitive metadata.

---

# 22. TypeScript Configuration

Base compiler settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "useUnknownInCatchVariables": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

Avoid disabling strict rules to make compilation pass.

Fix the type design instead.

---

# 23. ESLint

Use flat config.

Include:

- `@typescript-eslint/recommended-type-checked`
- `@typescript-eslint/stylistic-type-checked`
- import ordering
- unused import prevention
- promise handling
- exhaustive switch
- no floating promises
- no unsafe assignment
- no unsafe member access
- no explicit any
- consistent type imports

Suggested repository rules:

```text
max-lines: 200 production
complexity: <= 10 preferred
max-depth: <= 3 preferred
max-params: <= 4
```

Allow narrow exceptions only with documented inline reason.

Do not globally disable rules.

---

# 24. Prettier

Use one repository config.

Example:

```js
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
};
```

Formatting should run automatically on staged source files.

---

# 25. TSDoc Standard

## File-level block

Each production source file starts with a short purpose block.

Example:

```ts
/**
 * Evaluates deterministic spending rules before an agent payment can execute.
 *
 * This module contains no vendor-specific wallet logic.
 */
```

Do not add copyright banners unless required.

## Function block

Example:

```ts
/**
 * Evaluates whether an agent may execute a payment.
 *
 * @param input - Payment context and active policy configuration.
 * @returns A deterministic policy decision containing all evaluated checks.
 * @throws {InvalidPolicyError} When persisted policy configuration is invalid.
 */
export function evaluatePaymentPolicy(input: EvaluatePaymentPolicyInput): PolicyDecision {
  // implementation
}
```

Comments must explain:

- why
- invariant
- security constraint
- non-obvious design tradeoff

Comments must not explain syntax.

Bad:

```ts
// Increment count by one
count += 1;
```

---

# 26. Unit Testing Standard

Target:

- domain / policy / money code: **95%+ branch coverage**
- application services: **90%+ branch coverage**
- adapters: meaningful integration coverage
- overall project: **85%+**

Coverage percentage is not enough.

Critical financial invariants require explicit tests.

## Required policy tests

- exactly at daily budget
- one base unit above daily budget
- zero amount
- negative amount
- allowed asset
- blocked asset
- allowed network
- blocked network
- trusted recipient
- unknown recipient
- approval threshold boundary
- paused agent
- invalid policy
- task budget exceeded
- concurrent spend attempt

## Payment tests

- normal payment
- vendor timeout
- vendor failure
- duplicate idempotency key
- same key different payload
- retry
- insufficient balance
- policy changed between preview and execute
- expired preview
- audit failure
- confirmation reconciliation

---

# 27. Integration Tests

Test:

```text
API -> application -> database
MCP -> API/application
Privy adapter -> mocked provider contract
Hedera adapter -> testnet where CI secrets available
Graph adapter -> live smoke test separately
```

Do not make every PR dependent on public testnet availability.

CI categories:

1. deterministic unit/integration tests
2. optional scheduled vendor smoke tests

---

# 28. E2E Tests

Minimum Playwright flows:

## Flow 1

- open dashboard
- view agent
- view budget
- change allowed amount
- save
- verify updated value

## Flow 2

- simulated MCP payment
- payment appears in activity

Real testnet money flow can be a separate scripted smoke test.

---

# 29. CI Pipeline

GitHub Actions stages:

```text
install
  |
  +--> prettier:check
  +--> lint
  +--> typecheck
  +--> unit:test
  +--> integration:test
  +--> build
  +--> dependency:audit
```

Fail fast.

No merge to `main` unless all required checks pass.

Optional:

- CodeQL
- secret scanning
- dependency review
- test coverage upload

---

# 30. Git Workflow

Branches:

```text
feat/...
fix/...
docs/...
refactor/...
test/...
chore/...
```

Commit format:

```text
feat(mcp): add payment preview tool
fix(policy): reject stale payment previews
test(payment): cover idempotent retries
```

No giant “final code” commits.

Each commit should leave repository buildable where practical.

---

# 31. API Design

Version all external HTTP APIs:

```text
/api/v1/...
```

Suggested routes:

```text
POST   /api/v1/agents
GET    /api/v1/agents/:agentId
PATCH  /api/v1/agents/:agentId/status

GET    /api/v1/agents/:agentId/wallet
GET    /api/v1/agents/:agentId/budget
PUT    /api/v1/agents/:agentId/budget

GET    /api/v1/agents/:agentId/policy
PUT    /api/v1/agents/:agentId/policy

POST   /api/v1/payments/preview
POST   /api/v1/payments/:previewId/execute
GET    /api/v1/payments/:paymentId

GET    /api/v1/agents/:agentId/spend
GET    /api/v1/agents/:agentId/activity
```

Controllers remain thin.

Pattern:

```text
route
  -> schema validation
  -> authenticated context
  -> application use case
  -> serializer
```

---

# 32. Application Use Cases

Use explicit use-case names:

```text
CreateAgent
ProvisionAgentWallet
UpdateAgentBudget
UpdateSpendingPolicy
PreviewPayment
ExecutePayment
ReconcilePayment
GetAgentSpendSummary
ListAgentActivity
```

Each use case should typically have:

```ts
interface ExecutePaymentDependencies {
  payments: PaymentRepository;
  wallets: WalletProvider;
  policies: PolicyEvaluator;
  audit: AuditRepository;
  clock: Clock;
}
```

Use dependency injection without a heavyweight DI framework.

---

# 33. Repository Interfaces

Examples:

```ts
interface AgentRepository {
  findById(organizationId: OrganizationId, agentId: AgentId): Promise<Agent | null>;
}
```

Every query must be tenant scoped.

Avoid:

```ts
findById(agentId);
```

for multi-tenant resources.

---

# 34. Time

Inject a `Clock` interface.

```ts
interface Clock {
  now(): Date;
}
```

Tests use deterministic clocks.

Do not scatter `new Date()` through financial logic.

---

# 35. IDs

Use prefixed opaque IDs:

```text
org_
agt_
wal_
pol_
prv_
pay_
aud_
svc_
tsk_
```

Example:

```text
agt_01J...
```

Use ULID or UUIDv7.

Never expose sequential database IDs.

---

# 36. Configuration

All configuration passes schema validation at startup.

Example:

```ts
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().min(1),
  PRIVY_APP_ID: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1),
  GRAPH_API_KEY: z.string().min(1),
  HEDERA_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
});
```

Application must fail fast on missing required configuration.

---

# 37. Environment Files

Commit:

```text
.env.example
```

Never commit:

```text
.env
.env.local
*.pem
*.key
wallet.json
```

`.env.example`:

```text
DATABASE_URL=
PRIVY_APP_ID=
PRIVY_APP_SECRET=
GRAPH_API_KEY=
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=
HEDERA_PRIVATE_KEY=
MCP_AGENT_TOKEN=
```

For real architecture, minimize use of a raw Hedera private key by agents. Keep settlement credentials server-side or use the selected secure wallet architecture.

---

# 38. Dashboard

Keep UI focused.

## Overview

```text
Research Agent

Wallet
0x...

Balance
18.42 USDC

Today
1.58 / 20.00 USDC

Status
ACTIVE
```

## Recent spend

Columns:

```text
Time
Service
Amount
Asset
Decision
Status
Transaction
```

## Policy

Editable:

- daily limit
- single-payment limit
- allowed assets
- allowed networks
- unknown recipient behavior
- approval threshold

## Activity

Timeline:

```text
Payment requested
Policy passed
Payment submitted
Payment confirmed
```

No unnecessary charts until core flows are complete.

---

# 39. Hermes Integration

Hermes supports custom MCP servers.

Document both remote and local setup.

Example conceptual command:

```bash
hermes mcp add pocket --url https://YOUR_HOST/mcp
```

Use the exact current Hermes syntax verified against the version installed during implementation.

## Agent instructions

Provide `examples/hermes/SYSTEM.md`:

```md
You have access to Pocket MCP tools.

Rules:

1. Never claim a payment succeeded until the payment tool returns a confirmed or submitted result.
2. Always call payment_preview before payment_execute.
3. Respect task budgets.
4. If payment is denied, do not attempt to bypass policy.
5. Prefer cheaper services when two providers offer equivalent output.
6. Never ask for or expose private keys.
7. When a payment requires approval, clearly explain the amount, recipient, service, and reason.
```

---

# 40. MCP Authentication

Remote MCP must not be open on the internet.

Use:

```text
Authorization: Bearer <scoped agent token>
```

Map token -> organization + agent + scopes.

Token must never choose its own organization or agent identity.

MCP handlers derive context from authentication.

---

# 41. Payment Preview Security

A preview is not a text response only.

Persist a prepared `PaymentIntent`.

Preview contains:

- canonical recipient
- base-unit amount
- asset
- network
- service
- purpose
- policy version
- budget snapshot
- expiration
- decision

Execution verifies again:

- intent not expired
- policy version still valid or re-evaluate
- budget still available
- agent still active
- wallet active
- no duplicate execution

Never assume preview remains valid forever.

---

# 42. Concurrency

Two Hermes tasks can try to spend simultaneously.

Budget enforcement must be transactional.

Example:

```text
Daily remaining: 1.00

Task A tries 0.80
Task B tries 0.80
```

Only one may pass.

Use database locking or atomic reservation.

Add:

```text
budget_reservations
```

if necessary.

Preferred model:

1. reserve amount atomically
2. submit transaction
3. finalize reservation
4. release on terminal failure

---

# 43. Human Approval

MVP can implement approval through dashboard.

State:

```text
approval_required
```

Dashboard shows:

```text
Agent: Research Agent
Amount: 5.00 USDC
Recipient: ...
Service: ...
Reason: above auto-pay threshold

[Approve] [Reject]
```

Approval endpoints must:

- authenticate human
- verify organization
- reject expired intent
- record actor
- append audit event

---

# 44. Service Registry

For x402 MVP, avoid arbitrary URLs.

Store known services:

```ts
interface PaidService {
  id: ServiceId;
  name: string;
  baseUrl: URL;
  category: ServiceCategory;
  status: 'active' | 'blocked';
}
```

Later:

- service discovery
- reputation
- pricing history
- agent marketplace

---

# 45. Analytics

## MVP metrics

Per agent:

- spend today
- spend 7d
- spend 30d
- payment count
- denied payments
- top service
- top recipient
- average payment
- new recipient count
- anomalous spend count

Do not build speculative AI scoring first.

Use transparent deterministic rules.

---

# 46. README Requirements

Root `README.md` must contain:

1. Project name.
2. One-sentence pitch.
3. Problem.
4. Solution.
5. Architecture diagram.
6. Why Privy.
7. Why Hedera.
8. Why The Graph.
9. Hermes integration.
10. Demo flow.
11. Screenshots/GIF after UI exists.
12. Local setup.
13. Environment variables.
14. Database setup.
15. Running tests.
16. Running MCP.
17. Running paid service.
18. Security disclaimer.
19. Hackathon limitations.
20. Roadmap.
21. License.

Keep it runnable by a judge.

---

# 47. SECURITY.md

Include:

- supported versions
- vulnerability reporting method
- do not submit production funds
- testnet-only warning for hackathon
- no guarantees
- key handling
- responsible disclosure

---

# 48. CONTRIBUTING.md

Include:

- prerequisites
- install
- branch naming
- code quality requirements
- max 200 lines/file
- test requirements
- doc requirements
- commit conventions
- PR checklist

---

# 49. Documentation Quality

Never create documentation files containing placeholders like:

```text
TODO
coming soon
TBD
```

unless the section is explicitly a roadmap.

Documentation must match implementation.

---

# 50. Build Phases

## Phase 0: Bootstrap

Deliver:

- monorepo
- TypeScript strict config
- ESLint
- Prettier
- Vitest
- CI
- package boundaries
- env schema
- basic README

Exit criteria:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

all green.

---

## Phase 1: Domain + policy engine

Build:

- organization IDs
- agent IDs
- money type
- budget
- spending policy
- payment intent
- policy evaluator
- state machine

Write tests first for policy boundaries.

No vendor SDK yet.

Exit criteria:

- 95%+ branch coverage on policy code
- no DB dependency in domain

---

## Phase 2: Database

Build:

- migrations
- repositories
- tenant scoping
- audit log
- idempotency
- budget reservation

Exit criteria:

- integration tests against PostgreSQL
- concurrent budget test passes

---

## Phase 3: Privy

Build:

- wallet provider interface
- Privy adapter
- create wallet
- read wallet
- balance
- real payment path supported by selected Privy feature
- at least one Privy control

Exit criteria:

- real test wallet provisioned
- wallet visible in dashboard/API
- no signing secret exposed to Hermes

---

## Phase 4: Payment orchestration

Build:

- preview
- policy
- reserve budget
- submit
- audit
- status
- reconciliation
- failure recovery

Exit criteria:

- idempotency proven by tests
- policy re-check at execution
- duplicate execute cannot cause duplicate transaction

---

## Phase 5: MCP

Build:

- authenticated remote MCP
- agent profile
- balance
- budget
- preview
- execute
- policy explanation
- activity

Exit criteria:

Hermes can:

```text
get balance
preview payment
execute allowed payment
receive deterministic policy denial
```

---

## Phase 6: Hedera x402

Build:

- paid-service
- x402 challenge
- Hedera testnet settlement
- retry after payment
- audit event

Exit criteria:

Hermes autonomously purchases one real service.

---

## Phase 7: The Graph

Build:

- Graph adapter
- live Graph query
- spend aggregation
- anomalies
- MCP summary tool

Exit criteria:

Hermes answers:

> “How much have I spent and what is unusual?”

using live Graph-backed data.

---

## Phase 8: Dashboard

Build:

- agent overview
- spend
- policy editor
- approval queue
- audit timeline

Exit criteria:

Demo can be performed without database/admin tooling.

---

## Phase 9: Hardening

Run:

- dependency audit
- secret scan
- security tests
- authorization review
- replay tests
- concurrent payment tests
- log redaction tests
- API fuzz/property tests where useful

---

## Phase 10: Submission

Create:

- public repository
- 2-4 minute demo
- architecture diagram
- judging.md
- sponsor-specific explanation
- clean README
- setup script
- sample Hermes config

---

# 51. Priority Order

If time becomes limited, preserve this order:

```text
1. Hermes -> MCP
2. Policy / budget
3. Privy wallet
4. Real payment
5. Hedera x402
6. The Graph analytics
7. Dashboard
8. Human approval
9. visual polish
```

Do not sacrifice financial correctness for UI polish.

---

# 52. Hackathon Demo Script

## Scene 1: Create agent

Dashboard:

```text
Research Agent
Daily budget: $20
Single payment: $1
Asset: USDC
```

Show Privy wallet.

## Scene 2: Hermes

Prompt:

> Research Ethereum using paid sources. Maximum spend: $0.50.

## Scene 3: x402

Hermes requests paid resource.

Show:

```text
402 Payment Required
0.08
```

## Scene 4: Policy

Show MCP preview:

```text
Daily budget: PASS
Task budget: PASS
Asset: PASS
Recipient: PASS
Decision: ALLOW
```

## Scene 5: payment

Hedera testnet payment executes.

Show transaction reference.

## Scene 6: expensive request

Hermes encounters:

```text
Price: 0.75
```

Policy denies because task budget is insufficient.

Hermes chooses cheaper provider.

## Scene 7: analytics

Ask:

> How much did you spend and was anything unusual?

Hermes uses Graph-backed analytics.

## Scene 8: dashboard

Show:

```text
Spent: ...
Remaining: ...
Services: ...
Denied: ...
```

End pitch:

> Pocket lets autonomous agents spend money without giving them financial freedom they should not have.

---

# 53. Sponsor Explanation

## Privy

> Privy is the wallet and transaction-control foundation. Every autonomous agent receives a secure wallet without exposing signing secrets to the LLM. Privy wallet controls combine with Pocket’s application-level policies and budgets.

## Hedera

> Hedera is the machine-payment rail. Hermes consumes a real x402-gated service and settles the payment autonomously on Hedera testnet.

## The Graph

> The Graph is the live blockchain observability layer. Pocket uses Graph data to reconstruct agent transactions, analyze spending, detect anomalies, and make the information available to Hermes through MCP.

---

# 54. Security Acceptance Checklist

Before submission:

- [ ] No secrets committed.
- [ ] No private key exposed to Hermes.
- [ ] No unrestricted raw transaction MCP tool.
- [ ] All MCP input validated.
- [ ] All API input validated.
- [ ] Auth required on MCP.
- [ ] Tenant scoping tested.
- [ ] Policy engine deny-by-default.
- [ ] Budget concurrency tested.
- [ ] Idempotency tested.
- [ ] Payment preview expiry tested.
- [ ] Policy re-check before execute.
- [ ] Sensitive logs redacted.
- [ ] Database constraints in place.
- [ ] Audit events append-only.
- [ ] Real testnet only for hackathon demo.
- [ ] Dependencies audited.
- [ ] CORS configured.
- [ ] Rate limits configured.
- [ ] Errors do not expose stack traces.
- [ ] Graph query input cannot become arbitrary injection.
- [ ] x402 challenge validated.
- [ ] External service URL cannot create SSRF.
- [ ] README has security disclaimer.

---

# 55. Code Review Checklist

For every PR:

- [ ] Does each production file stay <= 200 lines?
- [ ] Is each function focused?
- [ ] Are public exports documented?
- [ ] Are parameter and return types explicit?
- [ ] Is any `any` present?
- [ ] Are trust-boundary values validated?
- [ ] Is money represented safely?
- [ ] Does new logic have tests?
- [ ] Are failure modes tested?
- [ ] Are authorization rules preserved?
- [ ] Is tenant scope explicit?
- [ ] Could this leak a secret?
- [ ] Could this execute twice?
- [ ] Could concurrent requests bypass the budget?
- [ ] Could an LLM override a financial policy?
- [ ] Are logs safe?
- [ ] Is vendor-specific code isolated?
- [ ] Is documentation still correct?
- [ ] Are lint/typecheck/tests/build green?

---

# 56. Definition of Done

A feature is done only if:

1. implementation exists
2. types are correct
3. tests exist
4. edge cases exist
5. docs updated
6. lint passes
7. formatting passes
8. typecheck passes
9. tests pass
10. build passes
11. security impact considered
12. no trash/dead/commented code remains

---

# 57. Claude Implementation Workflow

For each milestone Claude should:

## Step 1

Read:

```text
README.md
docs/architecture.md
docs/threat-model.md
this plan
```

## Step 2

State the small implementation goal.

## Step 3

Inspect existing code before editing.

Never duplicate an existing abstraction.

## Step 4

Implement the minimum coherent change.

## Step 5

Add tests in the same change.

## Step 6

Run:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Step 7

Fix every failure.

Do not suppress rules just to make CI pass.

## Step 8

Review modified files for:

- > 200 lines
- dead code
- useless comments
- insecure logs
- missing TSDoc
- duplicate logic

## Step 9

Update documentation.

## Step 10

Only then continue to the next milestone.

---

# 58. Do Not Do This

Claude must not:

- generate the entire repository in one enormous pass
- create 500-line “service” classes
- build generic repositories with dozens of unrelated methods
- put business logic inside API routes
- put business logic inside MCP handlers
- use `any`
- disable ESLint broadly
- add `// TODO fix later`
- add mock financial success paths and call them production-ready
- create hidden fallback behavior
- silently swallow exceptions
- catch errors without meaningful handling
- use floating-point money
- store plaintext private keys in DB
- return vendor credentials to client
- allow LLM reasoning to replace policy enforcement
- add blockchain technology solely for judging
- create dozens of premature interfaces
- write comments such as “initialize variable”
- build UI before core payment path works
- write fake Graph analytics when live Graph data is required
- call a hardcoded HTTP endpoint an x402 integration without real payment

---

# 59. Suggested First 12 Implementation Tasks

Execute in order.

### Task 1

Bootstrap pnpm workspace.

### Task 2

Create TypeScript, ESLint, Prettier, Vitest, CI.

### Task 3

Create domain value objects:

```text
AgentId
OrganizationId
Money
WalletAddress
```

### Task 4

Create policy engine + unit tests.

### Task 5

Create payment state machine + unit tests.

### Task 6

Create PostgreSQL schema + repositories.

### Task 7

Create budget reservation + concurrency tests.

### Task 8

Create Fastify API for agents, budget, policy, preview.

### Task 9

Create Privy wallet adapter and provision test wallet.

### Task 10

Create authenticated MCP and connect Hermes.

### Task 11

Complete real payment path.

### Task 12

Add Hedera x402 and Graph analytics.

Do not begin visual polish before Task 11 works.

---

# 60. Future Roadmap

After hackathon:

## Agent treasury

- organization-wide pool
- sub-wallets
- department budgets
- monthly allocations

## Service discovery

- registry
- pricing
- reputation
- reliability
- capability metadata

## Smart routing

- cheapest provider
- fastest provider
- quality-adjusted provider

## Multi-agent

```text
Company Treasury
  +--> Research Agent
  +--> Coding Agent
  +--> Support Agent
```

Each with separate policies.

## Risk engine

- behavioral anomaly models
- service reputation
- wallet reputation
- velocity limits

## SDK

```ts
const pocket = new Pocket({
  agentToken: process.env.MCP_AGENT_TOKEN,
});
```

## MCP catalog distribution

One-command Hermes installation.

---

# 61. Success Criteria

The project is successful when a judge can watch this:

```text
Hermes needs data
      |
      v
paid x402 service
      |
      v
Pocket checks policy
      |
      v
Privy wallet authorizes secure transaction
      |
      v
Hedera payment settles
      |
      v
Hermes receives result
      |
      v
The Graph tracks resulting onchain activity
      |
      v
dashboard + MCP explain spend
```

and immediately understand:

> **“This is financial infrastructure for autonomous AI agents.”**

---

# 62. Final Build Philosophy

Prefer:

```text
small
typed
tested
auditable
deterministic
secure
boring where money is involved
```

over:

```text
clever
abstract
magical
LLM-driven authorization
large
hard to audit
```

The agent may be probabilistic.

**The financial control plane must not be.**

---

# 63. Current Reference Links

Verify SDK/API details against current documentation during implementation.

- ETHOnline 2026 prizes: https://ethglobal.com/events/ethonline2026/prizes
- Privy docs: https://docs.privy.io/
- Hedera docs: https://docs.hedera.com/
- Hedera x402 overview: https://hedera.com/blog/hedera-and-the-x402-payment-standard/
- Hedera MCP resources: https://hedera.com/mcp-servers/
- The Graph docs: https://thegraph.com/docs/
- The Graph Subgraph MCP: https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/
- Hermes MCP docs: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/mcp.md
- Hermes CLI MCP reference: https://github.com/nousresearch/hermes-agent/blob/main/website/docs/reference/cli-commands.md

---

# 64. First Prompt to Give Claude

Copy this after adding this file to the repository:

```text
Read IMPLEMENTATION_PLAN.md completely before making changes.

We are building Pocket according to the plan.

Do not generate the full application at once.

Start only with Phase 0:
1. bootstrap the pnpm TypeScript monorepo,
2. configure strict TypeScript,
3. configure ESLint with type-aware rules,
4. configure Prettier,
5. configure Vitest,
6. configure workspace scripts,
7. configure GitHub Actions,
8. add .env.example,
9. add the initial README,
10. add architecture and security documentation skeletons containing real content, not placeholders.

Non-negotiable:
- production files <= 200 lines
- no any
- no dead/commented code
- exported modules/functions/types have useful TSDoc
- strict linting
- tests where behavior exists
- no secrets
- no speculative abstractions

If Ponytail or EDHD skills are available, use them. If they are unavailable, continue using IMPLEMENTATION_PLAN.md as the source of engineering conventions.

After completing Phase 0, run format, lint, typecheck, tests, and build. Fix all errors. Then stop and summarize exactly what was created. Do not begin Phase 1 until asked.
```
