import 'server-only';

import { cache } from 'react';

import { query, request } from './http';
import type { ApiResult } from './http';
import type {
  AgentDetail,
  AgentSummary,
  AgentTransfer,
  AuditEvent,
  Health,
  Payment,
  PaymentStats,
  PaymentStatus,
  Policy,
  SpendSummary,
  TaskBudget,
  Timeseries,
} from './types';

export type { ApiErr, ApiOk, ApiResult } from './http';

// Account administration — organization, credentials and agent registration.
export * from './api-account';

/**
 * `GET /v1/health` — adapter wiring, unauthenticated.
 *
 * @remarks Memoised for the duration of one render. The rail is drawn twice on
 * every page, once fixed and once inside the mobile drawer, and both halves
 * want the same answer. Without this each render asks the API twice for a
 * value that cannot have changed in between.
 */
export const getHealth = cache((): Promise<ApiResult<Health>> =>
  request<Health>('GET', '/v1/health'),
);

/** `GET /v1/agents` — every agent in the organization. */
export function listAgents(): Promise<ApiResult<{ agents: AgentSummary[] }>> {
  return request<{ agents: AgentSummary[] }>('GET', '/v1/agents');
}

/** `GET /v1/agents/:id` — agent, policy, task budgets and wallet balance. */
export function getAgent(id: string): Promise<ApiResult<AgentDetail>> {
  return request<AgentDetail>('GET', `/v1/agents/${encodeURIComponent(id)}`);
}

/** `GET /v1/payments` — payment history, optionally scoped by agent or status. */
export function listPayments(params: {
  agentId?: string;
  status?: PaymentStatus;
  limit?: number;
  cursor?: string;
}): Promise<ApiResult<{ payments: Payment[]; nextCursor: string | null }>> {
  return request<{ payments: Payment[]; nextCursor: string | null }>(
    'GET',
    `/v1/payments${query(params)}`,
  );
}

/** `GET /v1/payments/stats` — true counts by status over the window. */
export function getPaymentStats(params: {
  agentId?: string;
  days?: number;
}): Promise<ApiResult<PaymentStats>> {
  return request<PaymentStats>('GET', `/v1/payments/stats${query(params)}`);
}

/** `GET /v1/analytics/spend` — category, recipient and anomaly rollup. */
export function getSpendSummary(params: {
  agentId?: string;
  days?: number;
}): Promise<ApiResult<SpendSummary>> {
  return request<SpendSummary>('GET', `/v1/analytics/spend${query(params)}`);
}

/** `GET /v1/analytics/timeseries` — daily spend points. */
export function getTimeseries(params: {
  agentId?: string;
  days?: number;
}): Promise<ApiResult<Timeseries>> {
  return request<Timeseries>('GET', `/v1/analytics/timeseries${query(params)}`);
}

/** `GET /v1/audit` — reverse-chronological audit trail page. */
export function listAudit(params: {
  limit?: number;
  cursor?: string;
  /** An action family such as `payment`, matched as a prefix. */
  action?: string;
  actorType?: AuditEvent['actorType'];
}): Promise<ApiResult<{ events: AuditEvent[]; nextCursor: string | null }>> {
  return request<{ events: AuditEvent[]; nextCursor: string | null }>(
    'GET',
    `/v1/audit${query(params)}`,
  );
}

/** `PATCH /v1/agents/:id` — change operational status. */
export function patchAgent(
  id: string,
  body: { status?: AgentSummary['status']; description?: string },
): Promise<ApiResult<{ agent: AgentSummary }>> {
  return request<{ agent: AgentSummary }>('PATCH', `/v1/agents/${encodeURIComponent(id)}`, {
    body,
  });
}

/**
 * `POST /v1/agents/:id/transfer` — move an agent's whole balance to another.
 *
 * @param id The agent being emptied.
 * @param body The agent to receive the funds, and optionally the asset.
 */
export function transferAgentFunds(
  id: string,
  body: { toAgentId: string; asset?: string },
): Promise<ApiResult<{ transfer: AgentTransfer }>> {
  return request<{ transfer: AgentTransfer }>(
    'POST',
    `/v1/agents/${encodeURIComponent(id)}/transfer`,
    { body },
  );
}

/**
 * `DELETE /v1/agents/:id` — retire an agent.
 *
 * @param id The agent to delete.
 * @remarks Refused while the wallet still holds funds. The payments it made
 * stay in the ledger; only the agent stops being offered anywhere.
 */
export function deleteAgent(id: string): Promise<ApiResult<Record<string, never>>> {
  return request<Record<string, never>>('DELETE', `/v1/agents/${encodeURIComponent(id)}`);
}

/** `PUT /v1/agents/:id/budget` — replace the daily and per-transaction limits. */
export function putBudget(
  id: string,
  body: { asset: string; dailyLimit: string; perTransactionLimit: string },
): Promise<ApiResult<{ budget: NonNullable<AgentSummary['budget']> }>> {
  return request<{ budget: NonNullable<AgentSummary['budget']> }>(
    'PUT',
    `/v1/agents/${encodeURIComponent(id)}/budget`,
    { body },
  );
}

/** `PUT /v1/agents/:id/policy` — replace the whole policy document. */
export function putPolicy(id: string, body: Policy): Promise<ApiResult<{ policy: Policy }>> {
  return request<{ policy: Policy }>('PUT', `/v1/agents/${encodeURIComponent(id)}/policy`, {
    body,
  });
}

/** `POST /v1/agents/:id/task-budgets` — open a task-scoped budget. */
export function createTaskBudget(
  id: string,
  body: { label: string; asset: string; limit: string },
): Promise<ApiResult<{ taskBudget: TaskBudget }>> {
  return request<{ taskBudget: TaskBudget }>(
    'POST',
    `/v1/agents/${encodeURIComponent(id)}/task-budgets`,
    { body },
  );
}

/** `POST /v1/task-budgets/:id/close` — close a task budget. */
export function closeTaskBudget(id: string): Promise<ApiResult<{ taskBudget: TaskBudget }>> {
  return request<{ taskBudget: TaskBudget }>(
    'POST',
    `/v1/task-budgets/${encodeURIComponent(id)}/close`,
  );
}

/** `POST /v1/payments/:id/approve` — release a held payment. */
export function approvePayment(
  id: string,
  note?: string,
): Promise<ApiResult<{ payment: Payment }>> {
  return request<{ payment: Payment }>('POST', `/v1/payments/${encodeURIComponent(id)}/approve`, {
    body: { note },
  });
}

/** `POST /v1/payments/:id/reject` — refuse a held payment. */
export function rejectPayment(id: string, note?: string): Promise<ApiResult<{ payment: Payment }>> {
  return request<{ payment: Payment }>('POST', `/v1/payments/${encodeURIComponent(id)}/reject`, {
    body: { note },
  });
}

/**
 * `POST /v1/agents/:id/wallet/activate` — publish a wallet's key on chain.
 *
 * @param agentId Agent whose wallet should sign.
 * @returns The account id, and whether this call was what published the key.
 * @remarks Costs the wallet gas and moves no money. Safe to call twice: an
 *   account that has already published its key is left alone.
 */
export function activateWallet(agentId: string): Promise<
  ApiResult<{
    accountId: string;
    activated: boolean;
    txHash: string | null;
    alreadyActive: boolean;
    /** Whether a mirror node could already see the published key. */
    confirmed: boolean;
  }>
> {
  return request('POST', `/v1/agents/${agentId}/wallet/activate`, { body: {} });
}
