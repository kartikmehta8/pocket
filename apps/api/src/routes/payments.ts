/**
 * Payment preview, execution, listing and human approval.
 *
 * A policy denial is a business outcome, not an HTTP error. Blocked payments
 * come back as `200` with `status: "blocked"` and the violations that caused
 * it, so an agent can read the reason and choose a cheaper provider rather
 * than having to interpret a status code.
 */

import type { FastifyInstance } from 'fastify';
import { PocketError, paymentRequestSchema, type PaymentStatus } from '@pocket/core';
import {
  appendAuditEvent,
  chargeTaskBudget,
  getPayment,
  listPayments,
  recordApproval,
  updatePaymentStatus,
} from '@pocket/db';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { decisionToJson, paymentToJson } from '../serialize.js';
import { executePayment, previewPayment } from '../services/payments.js';
import { settlePayment } from '../services/settlement.js';
import { getAgentBundle } from '@pocket/db';

const approvalSchema = z.object({ note: z.string().max(500).optional() });
const listQuerySchema = z.object({
  agentId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

/**
 * Reads the idempotency key, which execution requires.
 *
 * @param header - Raw header value.
 * @returns The key.
 * @throws {PocketError} `VALIDATION_FAILED` when absent. Requiring it makes
 *   every execution safely retryable, which matters most when a network
 *   timeout leaves the caller unsure whether money moved.
 */
function requireIdempotencyKey(header: unknown): string {
  if (typeof header !== 'string' || header.trim() === '') {
    throw new PocketError('VALIDATION_FAILED', 'An Idempotency-Key header is required.');
  }
  return header.trim();
}

/**
 * Registers payment routes.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerPaymentRoutes(app: FastifyInstance, ctx: AppContext): void {
  const deps = {
    db: ctx.db,
    wallet: ctx.wallet,
    chain: ctx.chain,
    market: ctx.market,
    logger: app.log,
  };

  app.post('/v1/payments/preview', async (request) => {
    const body = paymentRequestSchema.parse(request.body);
    const decision = await previewPayment(deps, request.orgId, body);
    return { decision: decisionToJson(decision, body.asset) };
  });

  app.post('/v1/payments', async (request) => {
    const body = paymentRequestSchema.parse(request.body);
    const key = requireIdempotencyKey(request.headers['idempotency-key']);
    const result = await executePayment(deps, request.orgId, key, body);
    const bundle = await getAgentBundle(ctx.db, request.orgId, result.payment.agentId);
    return {
      payment: paymentToJson({ ...result.payment, agentName: bundle?.agent.name ?? '' }, (hash) =>
        ctx.chain.explorerUrl(hash),
      ),
      decision: decisionToJson(result.decision, body.asset),
      replayed: result.replayed,
    };
  });

  app.get('/v1/payments', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const rows = await listPayments(ctx.db, request.orgId, {
      agentId: query.agentId,
      status: query.status as PaymentStatus | undefined,
      limit: query.limit,
    });
    return {
      payments: rows.map((row) => paymentToJson(row, (hash) => ctx.chain.explorerUrl(hash))),
    };
  });

  app.get<{ Params: { id: string } }>('/v1/payments/:id', async (request) => {
    const payment = await getPayment(ctx.db, request.orgId, request.params.id);
    if (payment === null) throw new PocketError('NOT_FOUND', 'Payment not found.');
    return { payment: paymentToJson(payment, (hash) => ctx.chain.explorerUrl(hash)) };
  });

  app.post<{ Params: { id: string } }>('/v1/payments/:id/approve', async (request) => {
    const body = approvalSchema.parse(request.body ?? {});
    const payment = await getPayment(ctx.db, request.orgId, request.params.id);
    if (payment === null) throw new PocketError('NOT_FOUND', 'Payment not found.');
    if (payment.status !== 'awaiting_approval') {
      throw new PocketError('CONFLICT', `Payment is ${payment.status} and cannot be approved.`, {
        status: payment.status,
      });
    }

    await ctx.db.transaction(async (tx) => {
      await recordApproval(tx, {
        paymentId: payment.id,
        decidedBy: 'operator',
        approved: true,
        note: body.note,
      });
      await appendAuditEvent(tx, {
        orgId: request.orgId,
        actorType: 'human',
        action: 'payment.approved',
        subjectType: 'payment',
        subjectId: payment.id,
        payload: { note: body.note ?? null },
      });
    });

    const approved = await updatePaymentStatus(ctx.db, payment.id, { status: 'approved' });
    const bundle = await getAgentBundle(ctx.db, request.orgId, payment.agentId);
    if (bundle?.wallet == null) {
      throw new PocketError('WALLET_NOT_PROVISIONED', 'Agent has no wallet to pay from.');
    }

    const settled = await settlePayment(
      deps,
      request.orgId,
      approved,
      bundle.wallet.providerWalletId,
      bundle.wallet.address,
    );
    return {
      payment: paymentToJson({ ...settled, agentName: bundle.agent.name }, (hash) =>
        ctx.chain.explorerUrl(hash),
      ),
    };
  });

  app.post<{ Params: { id: string } }>('/v1/payments/:id/reject', async (request) => {
    const body = approvalSchema.parse(request.body ?? {});
    const payment = await getPayment(ctx.db, request.orgId, request.params.id);
    if (payment === null) throw new PocketError('NOT_FOUND', 'Payment not found.');
    if (payment.status !== 'awaiting_approval') {
      throw new PocketError('CONFLICT', `Payment is ${payment.status} and cannot be rejected.`, {
        status: payment.status,
      });
    }

    const rejected = await ctx.db.transaction(async (tx) => {
      await recordApproval(tx, {
        paymentId: payment.id,
        decidedBy: 'operator',
        approved: false,
        note: body.note,
      });
      // Release the reservation taken at authorization time; this money will
      // never move, so holding the headroom would starve later payments.
      if (payment.taskBudgetId !== null) {
        await chargeTaskBudget(tx, payment.taskBudgetId, -payment.amount);
      }
      await appendAuditEvent(tx, {
        orgId: request.orgId,
        actorType: 'human',
        action: 'payment.rejected',
        subjectType: 'payment',
        subjectId: payment.id,
        payload: { note: body.note ?? null },
      });
      return payment;
    });

    const updated = await updatePaymentStatus(ctx.db, rejected.id, { status: 'blocked' });
    return { payment: paymentToJson(updated, (hash) => ctx.chain.explorerUrl(hash)) };
  });
}
