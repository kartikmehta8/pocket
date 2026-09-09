/**
 * Domain vocabulary and entity shapes.
 *
 * The closed sets here (statuses, categories, behaviours) are the single
 * source of truth for what Pocket understands. The schemas that validate
 * untrusted input against them live in `./schemas.js`.
 */

/** What a payment was for. Drives policy and dashboard categorisation. */
export const PAYMENT_CATEGORIES = [
  'research',
  'inference',
  'data',
  'compute',
  'storage',
  'api',
  'agent-service',
  'other',
] as const;

/** Union of supported payment categories. */
export type PaymentCategory = (typeof PAYMENT_CATEGORIES)[number];

/** Whether a person or an autonomous agent initiated a payment. */
export const INITIATORS = ['agent', 'human'] as const;

/** Union of payment initiators. */
export type Initiator = (typeof INITIATORS)[number];

/** Lifecycle of a payment, from policy evaluation through settlement. */
export const PAYMENT_STATUSES = [
  'blocked',
  'awaiting_approval',
  'approved',
  'submitted',
  'settled',
  'failed',
] as const;

/** Union of payment lifecycle states. */
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** What Pocket does when an agent pays an address it has never paid before. */
export const UNKNOWN_RECIPIENT_BEHAVIOURS = ['block', 'require_approval', 'allow'] as const;

/** Union of unknown-recipient behaviours. */
export type UnknownRecipientBehaviour = (typeof UNKNOWN_RECIPIENT_BEHAVIOURS)[number];

/** Operational state of an agent. Only `active` agents may spend. */
export const AGENT_STATUSES = ['active', 'paused', 'revoked'] as const;

/** Union of agent states. */
export type AgentStatus = (typeof AGENT_STATUSES)[number];

/** An organization: the tenant boundary for every other entity. */
export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
}

/** An autonomous agent that holds a wallet and spends under policy. */
export interface Agent {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  status: AgentStatus;
  metadata: Record<string, string>;
  createdAt: Date;
}

/** A Privy-backed wallet bound to exactly one agent. */
export interface Wallet {
  id: string;
  orgId: string;
  agentId: string;
  provider: string;
  providerWalletId: string;
  address: string;
  chain: string;
  createdAt: Date;
}

/** An agent's recurring spending envelope. */
export interface Budget {
  id: string;
  agentId: string;
  asset: string;
  dailyLimit: bigint;
  perTransactionLimit: bigint;
}

/** A budget scoped to a single unit of work, consumed as the task runs. */
export interface TaskBudget {
  id: string;
  agentId: string;
  label: string;
  asset: string;
  limit: bigint;
  spent: bigint;
  closedAt: Date | null;
  createdAt: Date;
}

/** A recorded payment attempt and its settlement outcome. */
export interface Payment {
  id: string;
  orgId: string;
  agentId: string;
  taskBudgetId: string | null;
  idempotencyKey: string | null;
  amount: bigint;
  asset: string;
  chain: string;
  recipient: string;
  category: string;
  reason: string;
  resource: string | null;
  initiatedBy: Initiator;
  status: PaymentStatus;
  denialCode: string | null;
  txHash: string | null;
  createdAt: Date;
  settledAt: Date | null;
}

/** One append-only entry in the organization audit trail. */
export interface AuditEvent {
  id: string;
  orgId: string;
  actorType: 'agent' | 'human' | 'system';
  actorId: string | null;
  action: string;
  subjectType: string;
  subjectId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}
