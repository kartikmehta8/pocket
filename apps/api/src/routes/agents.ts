/**
 * Agent registration, wallet provisioning, budgets and policies.
 */

import type { FastifyInstance } from 'fastify';
import {
  PocketError,
  createAgentSchema,
  decimalsOf,
  parseAmount,
  setBudgetSchema,
  setPolicySchema,
  updateAgentSchema,
} from '@pocket/core';
import {
  appendAuditEvent,
  createAgent,
  getAgentBundle,
  listTaskBudgets,
  updateAgent,
  upsertBudget,
  upsertPolicy,
} from '@pocket/db';
import type { AppContext } from '../context.js';
import { readAccount, readBalance } from '../services/agent-chain.js';
import { provisionAgentWallet } from '../services/agent-provision.js';
import { seedAgentWallet } from '../services/agent-seed.js';
import { summariseAgent, summariseAllAgents } from '../services/agent-view.js';
import { taskBudgetToJson } from '../serialize.js';
import { policyToJson } from '../serialize-policy.js';

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
 * Registers agent routes.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerAgentRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post('/v1/agents', async (request, reply) => {
    const body = createAgentSchema.parse(request.body);
    const agent = await createAgent(ctx.db, { orgId: request.orgId, ...body });

    const wallet = await provisionAgentWallet(ctx, request.orgId, request.userId, agent);

    // After the agent exists, and never able to undo it: a treasury that
    // cannot pay is an operational fact, not a reason to lose the operator's
    // work. The transfer also creates the Hedera account and associates the
    // token, so a seeded agent can pay immediately.
    const seed = await seedAgentWallet(ctx, request.orgId, agent.id, wallet, request.log);

    reply.status(201);
    return {
      agent: await summariseAgent(ctx.db, request.orgId, agent),
      wallet: { address: wallet.address, chain: wallet.chain },
      seed,
    };
  });

  app.get('/v1/agents', async (request) => ({
    agents: await summariseAllAgents(ctx.db, request.orgId),
  }));

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
      // Null when there is no account to judge, not false: "we cannot see one"
      // and "we can see one and it is unusable" send a reader to different
      // places.
      accountHollow: account === null ? null : !account.keyPublished,
    };
  });

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
      // USD ceilings are stored in cents, so two decimal places.
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
