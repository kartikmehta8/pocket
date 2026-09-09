/**
 * The facilitator-settled x402 route.
 *
 * Two calls, deliberately separated. `authorize` runs the policy and budget
 * engines and only then signs, so a refused payment never becomes a payable
 * transaction. `settlement` records what the facilitator actually did, because
 * Pocket does not submit the transaction and must be told the outcome rather
 * than assume it.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PocketError, categorySchema } from '@pocket/core';
import { PrivyWalletProvider } from '@pocket/adapters';
import type { AppContext } from '../context.js';
import { decisionToJson, paymentToJson } from '../serialize.js';
import { authorizeX402Payment } from '../services/x402.js';
import { purchaseResource } from '../services/x402-purchase.js';
import { recordSettlement } from '../services/x402-settle.js';

const requirementsSchema = z.object({
  scheme: z.string().min(1),
  network: z.string().min(1),
  amount: z.string().regex(/^\d+$/, 'Base units only.'),
  asset: z.string().min(1),
  payTo: z.string().min(1),
  maxTimeoutSeconds: z.number().int().positive(),
  extra: z.record(z.string(), z.unknown()).nullish(),
});

const authorizeSchema = z.object({
  agentId: z.string().min(1),
  requirements: requirementsSchema,
  resource: z.string().min(1).max(500),
  reason: z.string().min(1).max(500),
  category: categorySchema.default('data'),
  taskBudgetId: z.string().optional(),
  /** Precision of the settlement asset, as the seller advertised it. */
  decimals: z.number().int().min(0).max(18).default(6),
});

const purchaseSchema = z.object({
  agentId: z.string().min(1),
  url: z.string().min(1).max(2000),
  reason: z.string().min(1).max(500),
  category: categorySchema.default('data'),
  taskBudgetId: z.string().optional(),
  /** Set to buy the same resource twice on purpose. */
  purchaseId: z.string().min(8).max(64).optional(),
});

const settlementSchema = z.object({
  success: z.boolean(),
  /** Hedera transaction id the facilitator returned. */
  transactionId: z.string().max(200).optional(),
  reason: z.string().max(500).optional(),
});

/**
 * Registers the x402 routes.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerX402Routes(app: FastifyInstance, ctx: AppContext): void {
  app.post('/v1/payments/x402/authorize', async (request) => {
    if (!(ctx.wallet instanceof PrivyWalletProvider)) {
      throw new PocketError(
        'UPSTREAM_UNAVAILABLE',
        'Facilitator-settled payments need a live Privy wallet provider.',
      );
    }
    const key = request.headers['idempotency-key'];
    if (typeof key !== 'string' || key.trim() === '') {
      throw new PocketError('VALIDATION_FAILED', 'An Idempotency-Key header is required.');
    }
    const body = authorizeSchema.parse(request.body);

    const result = await authorizeX402Payment(
      {
        db: ctx.db,
        market: ctx.market,
        wallet: ctx.wallet,
        chain: ctx.config.CHAIN,
        mirrorNodeUrl: ctx.config.HEDERA_MIRROR_URL,
      },
      request.orgId,
      // A caller-supplied key, so it keeps exact semantics and no window.
      [key.trim()],
      body,
    );

    return {
      payment: paymentToJson(result.payment, (hash) => ctx.chain.explorerUrl(hash)),
      decision: decisionToJson(result.decision, result.payment.asset),
      paymentPayload: result.paymentPayload,
      replayed: result.replayed,
    };
  });

  app.post<{ Params: { id: string } }>('/v1/payments/:id/settlement', async (request) => {
    const body = settlementSchema.parse(request.body ?? {});
    const payment = await recordSettlement(ctx.db, request.orgId, request.params.id, body);
    return { payment: paymentToJson(payment, (hash) => ctx.chain.explorerUrl(hash)) };
  });

  app.post('/v1/payments/x402/purchase', async (request) => {
    if (!(ctx.wallet instanceof PrivyWalletProvider)) {
      throw new PocketError(
        'UPSTREAM_UNAVAILABLE',
        'Facilitator-settled payments need a live Privy wallet provider.',
      );
    }
    const body = purchaseSchema.parse(request.body);

    // The whole flow runs server-side: fetch, authorise, sign, present, settle.
    // A caller cannot skip the policy step, because there is no step to skip —
    // it never holds a signed payload of its own.
    return purchaseResource(
      {
        db: ctx.db,
        market: ctx.market,
        wallet: ctx.wallet,
        chain: ctx.chain,
        chainId: ctx.config.CHAIN,
        mirrorNodeUrl: ctx.config.HEDERA_MIRROR_URL,
        allowPrivateHosts: ctx.config.ALLOW_PRIVATE_RESOURCE_HOSTS,
      },
      request.orgId,
      {
        agentId: body.agentId,
        url: body.url,
        reason: body.reason,
        category: body.category,
        ...(body.taskBudgetId === undefined ? {} : { taskBudgetId: body.taskBudgetId }),
        ...(body.purchaseId === undefined ? {} : { purchaseId: body.purchaseId }),
        // A machine credential means an agent asked; a session means a person
        // clicked. Both are subject to identical policy.
        initiatedBy: request.principal === 'session' ? 'human' : 'agent',
      },
    );
  });
}
