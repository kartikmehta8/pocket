/**
 * Spend intelligence and the audit trail.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isAssetId, type AssetId } from '@purse/core';
import { countByStatus, getAgentBundle, listAuditEvents } from '@purse/db';
import type { AppContext } from '../context.js';
import { auditEventToJson } from '../serialize.js';
import { spendSummary, spendTimeseries } from '../services/analytics.js';

const analyticsQuerySchema = z.object({
  agentId: z.string().optional(),
  days: z.coerce.number().int().positive().max(365).optional(),
  asset: z.string().optional(),
});

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().optional(),
});

/**
 * Registers analytics and audit routes.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerAnalyticsRoutes(app: FastifyInstance, ctx: AppContext): void {
  const deps = { db: ctx.db, analytics: ctx.analytics };

  app.get('/v1/analytics/spend', async (request) => {
    const query = analyticsQuerySchema.parse(request.query);
    const asset: AssetId = isAssetId(query.asset ?? '') ? (query.asset as AssetId) : 'USDC';

    // Reconciliation against The Graph needs a wallet address to inspect, so
    // it only runs when the report is scoped to a single agent.
    let address: string | undefined;
    if (query.agentId !== undefined) {
      const bundle = await getAgentBundle(ctx.db, request.orgId, query.agentId);
      address = bundle?.wallet?.address;
    }

    return spendSummary(deps, request.orgId, {
      agentId: query.agentId,
      days: query.days ?? 7,
      asset,
      address,
    });
  });

  app.get('/v1/analytics/timeseries', async (request) => {
    const query = analyticsQuerySchema.parse(request.query);
    return spendTimeseries(deps, request.orgId, {
      agentId: query.agentId,
      days: query.days ?? 14,
      asset: query.asset ?? 'USDC',
    });
  });

  app.get('/v1/payments/stats', async (request) => {
    const query = analyticsQuerySchema.parse(request.query);
    const days = query.days ?? 7;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const counts = await countByStatus(ctx.db, request.orgId, query.agentId, from);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return {
      days,
      total,
      settled: counts['settled'] ?? 0,
      submitted: counts['submitted'] ?? 0,
      blocked: counts['blocked'] ?? 0,
      awaitingApproval: counts['awaiting_approval'] ?? 0,
      failed: counts['failed'] ?? 0,
    };
  });

  app.get('/v1/audit', async (request) => {
    const query = auditQuerySchema.parse(request.query);
    const page = await listAuditEvents(ctx.db, request.orgId, {
      limit: query.limit ?? 50,
      cursor: query.cursor,
    });
    return { events: page.events.map(auditEventToJson), nextCursor: page.nextCursor };
  });
}
