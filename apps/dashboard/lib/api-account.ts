/**
 * Account administration: the organization, its credentials, and registering
 * an agent.
 *
 * Re-exported from `@/lib/api`, which stays the single import site for the
 * whole API client.
 */

import 'server-only';

import { request } from './http';
import type { ApiResult } from './http';
import type {
  AgentSummary,
  ApiKey,
  Organization,
  Principal,
  PurchaseOutcome,
  SessionUser,
} from './types';

/** The tenant, the signed-in person, and how this caller authenticated. */
export interface Account {
  org: Organization;
  /** Null for a machine caller: an API key belongs to an organization, not a person. */
  user: SessionUser | null;
  principal: Principal;
}

/** `GET /v1/orgs/me` — the signed-in tenant and how the caller authenticated. */
export function getOrg(): Promise<ApiResult<Account>> {
  return request<Account>('GET', '/v1/orgs/me');
}

/** `PATCH /v1/orgs/me` — rename the organization. Requires a signed-in person. */
export function renameOrg(name: string): Promise<ApiResult<{ org: Organization }>> {
  return request<{ org: Organization }>('PATCH', '/v1/orgs/me', { body: { name } });
}

/** `GET /v1/api-keys` — every key, live and revoked. Never returns a secret. */
export function listApiKeys(): Promise<ApiResult<{ keys: ApiKey[] }>> {
  return request<{ keys: ApiKey[] }>('GET', '/v1/api-keys');
}

/**
 * `POST /v1/api-keys` — mint a key.
 *
 * @param label What will use the key, so it can later be revoked by purpose.
 * @returns The key summary and its plaintext, which the response body carries
 *   exactly once. Show it immediately; it cannot be fetched again.
 */
export function createApiKey(label: string): Promise<ApiResult<{ key: ApiKey; apiKey: string }>> {
  return request<{ key: ApiKey; apiKey: string }>('POST', '/v1/api-keys', { body: { label } });
}

/** `DELETE /v1/api-keys/:id` — revoke a key. The last live key cannot be revoked. */
export function revokeApiKey(id: string): Promise<ApiResult<{ key: ApiKey }>> {
  return request<{ key: ApiKey }>('DELETE', `/v1/api-keys/${encodeURIComponent(id)}`);
}

/** `POST /v1/agents` — register an agent and provision its wallet. */
export function createAgent(body: {
  name: string;
  description?: string;
}): Promise<ApiResult<{ agent: AgentSummary; wallet: { address: string; chain: string } }>> {
  return request<{ agent: AgentSummary; wallet: { address: string; chain: string } }>(
    'POST',
    '/v1/agents',
    { body },
  );
}

/**
 * `POST /v1/payments/x402/purchase` — buy a paid resource end to end.
 *
 * @param body Agent, resource URL and spending context.
 * @returns What happened. A policy refusal comes back as `status: "blocked"`
 *   with the decision attached, not as a transport error.
 * @remarks The fetch, the policy decision, the signature and the settlement all
 *   happen inside the API. The browser never sees a signed payload.
 */
export function purchaseResource(body: {
  agentId: string;
  url: string;
  reason: string;
  category: string;
  taskBudgetId?: string;
}): Promise<ApiResult<PurchaseOutcome>> {
  return request<PurchaseOutcome>('POST', '/v1/payments/x402/purchase', { body });
}
