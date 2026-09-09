/**
 * MCP tool definitions.
 *
 * Every tool returns structured JSON as text, and every failure comes back as
 * a tool result rather than a thrown error, because an agent needs to read why
 * it was refused in order to do something sensible about it.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PocketApiError, type PocketClient } from './client.js';

/** Renders any value as a single JSON text block. */
function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

/**
 * Runs a tool body, converting an API error into a readable tool result.
 *
 * @param run - The tool body.
 * @returns The tool result, or a structured error the agent can act on.
 */
async function guard(run: () => Promise<unknown>) {
  try {
    return json(await run());
  } catch (cause) {
    if (cause instanceof PocketApiError) {
      return json({ error: { code: cause.code, message: cause.message, details: cause.details } });
    }
    return json({ error: { code: 'MCP_TOOL_FAILED', message: String(cause) } });
  }
}

/**
 * Registers every Pocket tool on an MCP server.
 *
 * @param server - The MCP server to register on.
 * @param client - Authenticated Pocket API client.
 */
export function registerTools(server: McpServer, client: PocketClient): void {
  server.registerTool(
    'pocket_list_agents',
    {
      title: 'List agents',
      description:
        'List the agents in this organization with their wallet, daily budget and spend so far today.',
      inputSchema: {},
    },
    async () => guard(() => client.listAgents()),
  );

  server.registerTool(
    'pocket_get_agent',
    {
      title: 'Get agent',
      description: 'Load one agent with its spending policy, task budgets and wallet balance.',
      inputSchema: { agentId: z.string().describe('Agent identifier, for example agent_1a2b3c.') },
    },
    async ({ agentId }) => guard(() => client.getAgent(agentId)),
  );

  server.registerTool(
    'pocket_preview_payment',
    {
      title: 'Preview a payment',
      description:
        'Ask whether a payment would be allowed, without recording or settling anything. ' +
        'Always call this before committing to a purchase you are not sure you can afford.',
      inputSchema: {
        agentId: z.string(),
        amount: z.string().describe('Decimal string, for example "0.08". Never a number.'),
        asset: z.enum(['USDC', 'HBAR']),
        chain: z.enum(['hedera-testnet', 'hedera-mainnet']).default('hedera-testnet'),
        recipient: z.string().describe('0x-prefixed recipient address.'),
        category: z.enum([
          'research',
          'inference',
          'data',
          'compute',
          'storage',
          'api',
          'agent-service',
          'other',
        ]),
        reason: z.string().describe('Why this payment is being made. Recorded in the audit trail.'),
        taskBudgetId: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => guard(() => client.preview(args)),
  );

  server.registerTool(
    'pocket_pay_for_resource',
    {
      title: 'Buy a paid resource',
      description:
        'Fetch a URL and, if it responds 402 Payment Required, pay for it through Pocket and ' +
        'return the content. A refusal comes back as "blocked" with the remaining budget, so ' +
        'you can pick a cheaper provider. A retry of one that already paid comes back as ' +
        '"replayed" with the original receipt: charged once, not twice.',
      inputSchema: {
        agentId: z.string(),
        url: z.string().url().describe('The paid resource to fetch.'),
        reason: z.string().describe('Why this resource is needed. Recorded in the audit trail.'),
        category: z
          .enum([
            'research',
            'inference',
            'data',
            'compute',
            'storage',
            'api',
            'agent-service',
            'other',
          ])
          .optional(),
        taskBudgetId: z
          .string()
          .optional()
          .describe('Charge against this task budget as well as the daily budget.'),
        purchaseId: z
          .string()
          .optional()
          .describe('Buy the same resource twice inside the retry window.'),
      },
    },
    async (args) => guard(() => client.purchase(args)),
  );

  server.registerTool(
    'pocket_create_task_budget',
    {
      title: 'Open a task budget',
      description: 'Open a spending envelope scoped to one unit of work.',
      inputSchema: {
        agentId: z.string(),
        label: z.string().describe('What this budget is for.'),
        asset: z.enum(['USDC', 'HBAR']).default('USDC'),
        limit: z.string().describe('Decimal string, for example "0.50".'),
      },
    },
    async ({ agentId, ...body }) => guard(() => client.createTaskBudget(agentId, body)),
  );

  server.registerTool(
    'pocket_spend_summary',
    {
      title: 'Spend summary',
      description:
        'Summarise spending over a window, broken down by category and recipient, with anomalies. ' +
        'Use this to answer questions like "how much did my research agent spend this week, and ' +
        'is anything unusual?".',
      inputSchema: {
        agentId: z.string().optional(),
        days: z.number().int().positive().max(365).default(7),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ agentId, days }) => {
      const params = new URLSearchParams({ days: String(days) });
      if (agentId !== undefined) params.set('agentId', agentId);
      return guard(() => client.spendSummary(`?${params.toString()}`));
    },
  );

  server.registerTool(
    'pocket_list_payments',
    {
      title: 'List payments',
      description: 'List recent payments, including the ones policy blocked and why.',
      inputSchema: {
        agentId: z.string().optional(),
        status: z
          .enum(['blocked', 'awaiting_approval', 'approved', 'submitted', 'settled', 'failed'])
          .optional(),
        limit: z.number().int().positive().max(200).default(25),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ agentId, status, limit }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (agentId !== undefined) params.set('agentId', agentId);
      if (status !== undefined) params.set('status', status);
      return guard(() => client.listPayments(`?${params.toString()}`));
    },
  );

  server.registerTool(
    'pocket_audit_trail',
    {
      title: 'Read the audit trail',
      description: 'Read the organization audit trail, newest first.',
      inputSchema: { limit: z.number().int().positive().max(200).default(50) },
      annotations: { readOnlyHint: true },
    },
    async ({ limit }) => guard(() => client.audit(`?limit=${limit}`)),
  );
}
