/**
 * Agent registration, wallet provisioning, budgets and policies.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AGENT_STATUSES,
  PocketError,
  createAgentSchema,
  isAssetId,
  type AssetId,
  decimalsOf,
  parseAmount,
  setBudgetSchema,
  setPolicySchema,
  transferAgentFundsSchema,
  updateAgentSchema,
} from '@pocket/core';
import {
  appendAuditEvent,
  createAgent,
  getAgentBundle,
  type AgentBundle,
  listTaskBudgets,
  softDeleteAgent,
  updateAgent,
  upsertBudget,
  upsertPolicy,
} from '@pocket/db';
import type { AppContext } from '../context.js';
import { readAccount, readBalance } from '../services/agent-chain.js';
import { provisionAgentWallet } from '../services/agent-provision.js';
import { seedAgentWallet } from '../services/agent-seed.js';
import { transferAgentFunds } from '../services/agent-transfer.js';
import { summariseAgent, summariseAllAgents } from '../services/agent-view.js';
import { taskBudgetToJson } from '../serialize.js';
import { policyToJson } from '../serialize-policy.js';

/**
 * What narrows the agent list.
 *
 * @remarks Every field is optional, and without `limit` the whole list comes
 * back. Pickers elsewhere in the product need all of it, and a picker showing
 * only the first page is one that hides the answer.
 */
const listAgentsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().max(128).optional(),
  status: z.enum(AGENT_STATUSES).optional(),
  q: z.string().max(120).optional(),
});

/**
 * Loads an agent or fails with a tenant-safe not-found.
 *
 * @param ctx - Application context.
 * @param orgId - Tenant scope.
 * @param agentId - Agent identifier.
 * @returns The agent bundle.
 * @throws {PocketError} `NOT_FOUND` when the agent is not in this organization.
 *   The same error is returned for "does not exist" and "belongs to someone
 *   else", so the API does not confirm the existence of another tenant's data.
 */
async function requireAgent(ctx: AppContext, orgId: string, agentId: string) {
  const bundle = await getAgentBundle(ctx.db, orgId, agentId);
  if (bundle === null) throw new PocketError('NOT_FOUND', 'Agent not found.', { agentId });
  return bundle;
}

/**
 * Which asset to move, in order of what the caller knows.
 *
 * @param body - The parsed request body.
 * @param from - The agent being emptied.
 * @returns The named asset, else the one its budget is denominated in, else
 *   USDC. A budget in an asset the contract does not recognise is ignored
 *   rather than passed on to the chain.
 */
function assetOf(body: { asset?: AssetId | undefined }, from: AgentBundle): AssetId {
  if (body.asset !== undefined) return body.asset;
  const budgeted = from.budget?.asset ?? '';
  return isAssetId(budgeted) ? budgeted : 'USDC';
}

/**
 * Whether a formatted balance is greater than zero.
 *
 * @param amount - Decimal string such as `"0.00"` or `"19.99"`.
 * @returns `true` when any digit is non-zero.
 * @remarks Character inspection rather than arithmetic, so no money value is
 *   routed through a binary float to answer a yes-or-no question.
 */
function hasFunds(amount: string): boolean {
  return /[1-9]/.test(amount);
}

/**
 * Registers agent routes.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerAgentRoutes(app: FastifyInstance, ctx: AppContext): void {
  /**
   * `POST /v1/agents` — registers an agent and provisions its wallet.
   *
   * Seeding happens after the agent exists and can never undo it. A treasury that
   * cannot pay is an operational fact, not a reason to lose the operator's work.
   * The transfer also creates the Hedera account and associates the token, so a
   * seeded agent can pay immediately.
   */
  app.post('/v1/agents', async (request, reply) => {
    const body = createAgentSchema.parse(request.body);
    const agent = await createAgent(ctx.db, { orgId: request.orgId, ...body });

    const wallet = await provisionAgentWallet(ctx, request.orgId, request.userId, agent);

    const seed = await seedAgentWallet(ctx, request.orgId, agent.id, wallet, request.log);

    reply.status(201);
    return {
      agent: await summariseAgent(ctx.db, request.orgId, agent),
      wallet: { address: wallet.address, chain: wallet.chain },
      seed,
    };
  });

  /** `GET /v1/agents` — one page, or every agent when no limit is given. */
  app.get('/v1/agents', async (request) => {
    const query = listAgentsQuerySchema.parse(request.query);
    return await summariseAllAgents(ctx.db, request.orgId, {
      limit: query.limit,
      cursor: query.cursor,
      status: query.status,
      search: query.q,
    });
  });

  /**
   * `GET /v1/agents/:id` — the agent with its policy, task budgets and balance.
   *
   * `accountHollow` is null when there is no account to judge rather than false.
   * "We cannot see one" and "we can see one and it is unusable" send a reader to
   * different places.
   */
  app.get<{ Params: { id: string } }>('/v1/agents/:id', async (request) => {
    const bundle = await requireAgent(ctx, request.orgId, request.params.id);
    const [summary, taskBudgets] = await Promise.all([
      summariseAgent(ctx.db, request.orgId, bundle.agent),
      listTaskBudgets(ctx.db, bundle.agent.id),
    ]);

    const [balance, account] = await Promise.all([
      readBalance(ctx, bundle.wallet, bundle.budget?.asset),
      readAccount(ctx, bundle.wallet),
    ]);

    return {
      agent: summary,
      policy: bundle.policy === null ? null : policyToJson(bundle.policy),
      taskBudgets: taskBudgets.map(taskBudgetToJson),
      balance,
      accountId: account?.accountId ?? null,
      accountHollow: account === null ? null : !account.keyPublished,
    };
  });

  /** `PATCH /v1/agents/:id` — renames an agent, or changes its status. */
  app.patch<{ Params: { id: string } }>('/v1/agents/:id', async (request) => {
    const body = updateAgentSchema.parse(request.body);
    await requireAgent(ctx, request.orgId, request.params.id);
    const agent = await updateAgent(ctx.db, request.orgId, request.params.id, body);
    if (agent === null) throw new PocketError('NOT_FOUND', 'Agent not found.');
    await appendAuditEvent(ctx.db, {
      orgId: request.orgId,
      actorType: 'human',
      action: 'agent.updated',
      subjectType: 'agent',
      subjectId: agent.id,
      payload: { ...body },
    });
    return { agent: await summariseAgent(ctx.db, request.orgId, agent) };
  });

  /** `POST /v1/agents/:id/transfer` — moves a balance to another agent. */
  app.post<{ Params: { id: string } }>('/v1/agents/:id/transfer', async (request) => {
    const body = transferAgentFundsSchema.parse(request.body);
    const [from, to] = await Promise.all([
      requireAgent(ctx, request.orgId, request.params.id),
      requireAgent(ctx, request.orgId, body.toAgentId),
    ]);
    const transfer = await transferAgentFunds(ctx, request.orgId, from, to, assetOf(body, from));
    return { transfer };
  });

  /**
   * `DELETE /v1/agents/:id` — retires an agent for good.
   *
   * The wallet is read before the delete, not after: once the agent is a tombstone
   * there is nothing on screen that would lead anyone back to the money.
   *
   * `force` exists because moving the balance is not always possible. A wallet
   * with no gas cannot send, and a lone agent has nowhere to send to. Refusing
   * outright would leave such an agent undeletable forever, so the operator may
   * say "leave it" — and what was left behind is named in the audit trail rather
   * than implied. The custody does not change, so reading that entry is the only
   * way anyone finds this money later.
   */
  app.delete<{ Params: { id: string }; Querystring: { force?: string } }>(
    '/v1/agents/:id',
    async (request, reply) => {
      const bundle = await requireAgent(ctx, request.orgId, request.params.id);

      const asset = bundle.budget?.asset ?? 'USDC';
      const balance = await readBalance(ctx, bundle.wallet, asset);
      const funded = balance !== null && hasFunds(balance.amount);

      if (funded && request.query.force !== 'true') {
        throw new PocketError(
          'CONFLICT',
          `${bundle.agent.name} still holds ${balance.amount} ${balance.asset}. Move the funds to another agent first.`,
          { agentId: bundle.agent.id, balance },
        );
      }

      const agent = await softDeleteAgent(ctx.db, request.orgId, request.params.id);
      if (agent === null) throw new PocketError('NOT_FOUND', 'Agent not found.');

      await appendAuditEvent(ctx.db, {
        orgId: request.orgId,
        actorType: 'human',
        action: 'agent.deleted',
        subjectType: 'agent',
        subjectId: agent.id,
        payload: {
          name: agent.name,
          walletAddress: bundle.wallet?.address ?? null,
          ...(funded ? { fundsLeft: `${balance.amount} ${balance.asset}` } : {}),
        },
      });

      return reply.code(204).send();
    },
  );

  /** `PUT /v1/agents/:id/budget` — replaces the daily and per-purchase ceilings. */
  app.put<{ Params: { id: string } }>('/v1/agents/:id/budget', async (request) => {
    const body = setBudgetSchema.parse(request.body);
    await requireAgent(ctx, request.orgId, request.params.id);
    const decimals = decimalsOf(body.asset);
    const budget = await upsertBudget(ctx.db, request.params.id, {
      asset: body.asset,
      dailyLimit: parseAmount(body.dailyLimit, decimals),
      perTransactionLimit: parseAmount(body.perTransactionLimit, decimals),
    });
    await appendAuditEvent(ctx.db, {
      orgId: request.orgId,
      actorType: 'human',
      action: 'budget.updated',
      subjectType: 'agent',
      subjectId: request.params.id,
      payload: { ...body },
    });
    return {
      budget: {
        asset: budget.asset,
        dailyLimit: body.dailyLimit,
        perTransactionLimit: body.perTransactionLimit,
      },
    };
  });

  /**
   * `PUT /v1/agents/:id/policy` — replaces the whole policy document.
   *
   * USD ceilings are stored in cents, so a dollar figure carries two decimal
   * places and no more.
   */
  app.put<{ Params: { id: string } }>('/v1/agents/:id/policy', async (request) => {
    const body = setPolicySchema.parse(request.body);
    await requireAgent(ctx, request.orgId, request.params.id);
    const decimals = decimalsOf(body.allowedAssets[0] ?? 'USDC');
    await upsertPolicy(ctx.db, request.params.id, {
      allowedAssets: body.allowedAssets,
      allowedChains: body.allowedChains,
      allowedCategories: body.allowedCategories,
      maxTransactionAmount: parseAmount(body.maxTransactionAmount, decimals),
      trustedRecipients: body.trustedRecipients.map((address) => address.toLowerCase()),
      unknownRecipientBehaviour: body.unknownRecipientBehaviour,
      approvalThreshold:
        body.approvalThreshold === undefined || body.approvalThreshold === null
          ? null
          : parseAmount(body.approvalThreshold, decimals),
      maxUsdCents:
        body.maxUsdPerTransaction === undefined || body.maxUsdPerTransaction === null
          ? null
          : parseAmount(body.maxUsdPerTransaction, 2),
    });
    await appendAuditEvent(ctx.db, {
      orgId: request.orgId,
      actorType: 'human',
      action: 'policy.updated',
      subjectType: 'agent',
      subjectId: request.params.id,
      payload: { ...body },
    });
    return { policy: body };
  });
}
