/**
 * TypeScript mirror of `API_CONTRACT.md`.
 *
 * Every monetary value is a decimal `string` beside its `asset` — never a
 * `number` — so no rounding happens between the API and the screen.
 */

/** Policy verdict for a proposed payment. */
export type Outcome = 'allow' | 'require_approval' | 'deny';

/** Lifecycle state of a payment. */
export type PaymentStatus =
  'blocked' | 'awaiting_approval' | 'approved' | 'submitted' | 'settled' | 'failed';

/** Operational state of an agent. */
export type AgentStatus = 'active' | 'paused' | 'revoked';

/** Spend category assigned to every payment. */
export type Category =
  'research' | 'inference' | 'data' | 'compute' | 'storage' | 'api' | 'agent-service' | 'other';

/** Behaviour applied when a recipient is not on the trusted list. */
export type UnknownRecipientBehaviour = 'block' | 'require_approval' | 'allow';

/** Who initiated a payment. */
export type Initiator = 'agent' | 'human';

/** A single policy rule that a payment breached. */
export interface Violation {
  code: string;
  message: string;
  details?: Record<string, string>;
}

/** Full policy evaluation of a proposed payment, including budget headroom. */
export interface Decision {
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

/** Agent row as returned by the list and detail endpoints. */
export interface AgentSummary {
  id: string;
  name: string;
  description: string | null;
  status: AgentStatus;
  createdAt: string;
  wallet: { address: string; chain: string } | null;
  budget: { asset: string; dailyLimit: string; perTransactionLimit: string } | null;
  spend: { today: string; dailyRemaining: string; paymentCount: number };
}

/** A payment attempt, settled or otherwise. */
export interface Payment {
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
  initiatedBy: Initiator;
  status: PaymentStatus;
  denialCode: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  taskBudgetId: string | null;
  createdAt: string;
  settledAt: string | null;
}

/** Spending rules enforced for one agent. */
export interface Policy {
  allowedAssets: string[];
  allowedChains: string[];
  allowedCategories: Category[];
  maxTransactionAmount: string;
  trustedRecipients: string[];
  unknownRecipientBehaviour: UnknownRecipientBehaviour;
  approvalThreshold: string | null;
}

/** A ring-fenced budget scoped to one task. */
export interface TaskBudget {
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

/** One immutable entry in the organization audit trail. */
export interface AuditEvent {
  id: string;
  actorType: 'agent' | 'human' | 'system';
  actorId: string | null;
  action: string;
  subjectType: string;
  subjectId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

/** How one adapter slot resolved. `live` is authoritative, never guessed. */
export interface AdapterMode {
  provider: string;
  live: boolean;
}

/** Adapter wiring reported by `GET /v1/health`. */
export interface Health {
  ok: boolean;
  adapters: {
    wallet: AdapterMode;
    chain: AdapterMode;
    analytics: AdapterMode;
    market: AdapterMode;
    identity: AdapterMode;
  };
  chain: string;
}

/** Aggregated spend over a window, from `GET /v1/analytics/spend`. */
export interface SpendSummary {
  periodSpend: string;
  currency: string;
  previousPeriodSpend: string;
  increasePercent: number;
  largestCategory: Category | null;
  byCategory: Array<{ category: Category; amount: string; count: number }>;
  byRecipient: Array<{ address: string; amount: string; count: number }>;
  anomalies: Array<{ type: string; severity: string; description: string }>;
  source: string;
}

/** Daily spend series from `GET /v1/analytics/timeseries`. */
export interface Timeseries {
  asset: string;
  points: Array<{ date: string; amount: string; count: number }>;
}

/** On-chain balance. `null` means the chain read failed: unknown, not zero. */
export interface Balance {
  asset: string;
  amount: string;
}

/** Real payment counts from `GET /v1/payments/stats`, not a truncated page. */
export interface PaymentStats {
  days: number;
  total: number;
  settled: number;
  submitted: number;
  blocked: number;
  awaitingApproval: number;
  failed: number;
}

/** Detail bundle from `GET /v1/agents/:id`. */
export interface AgentDetail {
  agent: AgentSummary;
  /** `null` until a policy is configured. An agent without one cannot spend. */
  policy: Policy | null;
  taskBudgets: TaskBudget[];
  balance: Balance | null;
}

// Account, credential and identity shapes.
export * from './types-account';
