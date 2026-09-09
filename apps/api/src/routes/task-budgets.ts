/**
 * Task-scoped budgets: the envelope a single unit of work draws on.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PocketError, createTaskBudgetSchema, decimalsOf, parseAmount } from '@pocket/core';
import {
  appendAuditEvent,
  closeTaskBudget,
  createTaskBudget,
  getAgentBundle,
  listTaskBudgets,
} from '@pocket/db';
import type { AppContext } from '../context.js';
import { taskBudgetToJson } from '../serialize.js';

const listQuerySchema = z.object({ open: z.enum(['true', 'false']).optional() });

/**
 * Registers task budget routes.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerTaskBudgetRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post<{ Params: { id: string } }>('/v1/agents/:id/task-budgets', async (request, reply) => {
    const body = createTaskBudgetSchema.parse(request.body);
    const bundle = await getAgentBundle(ctx.db, request.orgId, request.params.id);
    if (bundle === null) throw new PocketError('NOT_FOUND', 'Agent not found.');

    const task = await createTaskBudget(ctx.db, {
      orgId: request.orgId,
      agentId: request.params.id,
      label: body.label,
      asset: body.asset,
      limit: parseAmount(body.limit, decimalsOf(body.asset)),
    });

    await appendAuditEvent(ctx.db, {
      orgId: request.orgId,
      actorType: 'human',
      action: 'task_budget.created',
      subjectType: 'task_budget',
      subjectId: task.id,
      payload: {
        agentId: request.params.id,
        label: body.label,
        limit: body.limit,
        asset: body.asset,
      },
    });

    reply.status(201);
    return { taskBudget: taskBudgetToJson(task) };
  });

  app.get<{ Params: { id: string } }>('/v1/agents/:id/task-budgets', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const bundle = await getAgentBundle(ctx.db, request.orgId, request.params.id);
    if (bundle === null) throw new PocketError('NOT_FOUND', 'Agent not found.');
    const rows = await listTaskBudgets(ctx.db, request.params.id, query.open === 'true');
    return { taskBudgets: rows.map(taskBudgetToJson) };
  });

  app.post<{ Params: { id: string } }>('/v1/task-budgets/:id/close', async (request) => {
    const task = await closeTaskBudget(ctx.db, request.orgId, request.params.id);
    if (task === null) throw new PocketError('NOT_FOUND', 'Task budget not found.');
    await appendAuditEvent(ctx.db, {
      orgId: request.orgId,
      actorType: 'human',
      action: 'task_budget.closed',
      subjectType: 'task_budget',
      subjectId: task.id,
      payload: { spent: task.spent.toString(), asset: task.asset },
    });
    return { taskBudget: taskBudgetToJson(task) };
  });
}
