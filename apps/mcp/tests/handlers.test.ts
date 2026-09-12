/**
 * What a tool hands back to the agent that called it.
 *
 * Every tool answers with a result, never a thrown error, because an agent that
 * is told why it was refused can pick something cheaper while one that gets an
 * exception retries the same request. The refusal has to keep the API's own
 * code and message intact for that to be worth anything.
 *
 * The handlers are captured by registering them against a server that records
 * what it was given, which is the same trick the published catalogue uses.
 */

import { describe, expect, it, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { PocketApiError, type PocketClient } from '../src/client.js';
import { registerTools } from '../src/tools.js';

/** A tool handler, as the SDK would call it. */
type Handler = (args: Record<string, unknown>) => Promise<{ content: { text: string }[] }>;

/** Registers every tool against a stub and returns the handlers by name. */
function handlers(client: Partial<PocketClient>): {
  call: (name: string, args?: Record<string, unknown>) => Promise<{ content: { text: string }[] }>;
} {
  const found = new Map<string, Handler>();
  const recorder = {
    registerTool(name: string, _config: unknown, handler: Handler) {
      found.set(name, handler);
    },
  };
  registerTools(recorder as unknown as McpServer, client as PocketClient);
  return {
    call(name, args = {}) {
      const handler = found.get(name);
      if (handler === undefined) throw new Error(`No tool named ${name}.`);
      return handler(args);
    },
  };
}

/** The JSON a tool result carries. */
function payload(result: { content: { text: string }[] }): unknown {
  return JSON.parse(result.content[0]?.text ?? 'null');
}

describe('every tool', () => {
  it('passes its arguments through to the client', async () => {
    const client = {
      listAgents: vi.fn().mockResolvedValue({ agents: [] }),
      getAgent: vi.fn().mockResolvedValue({ agent: { id: 'agent_1' } }),
      preview: vi.fn().mockResolvedValue({ decision: { outcome: 'allow' } }),
      purchase: vi.fn().mockResolvedValue({ status: 'paid' }),
      createTaskBudget: vi.fn().mockResolvedValue({ taskBudget: { id: 'task_1' } }),
      spendSummary: vi.fn().mockResolvedValue({ periodSpend: '1.00' }),
      listPayments: vi.fn().mockResolvedValue({ payments: [] }),
      audit: vi.fn().mockResolvedValue({ events: [] }),
    };
    const tool = handlers(client);

    expect(payload(await tool.call('pocket_list_agents'))).toEqual({ agents: [] });

    await tool.call('pocket_get_agent', { agentId: 'agent_1' });
    expect(client.getAgent).toHaveBeenCalledWith('agent_1');

    await tool.call('pocket_preview_payment', { agentId: 'agent_1', amount: '1' });
    expect(client.preview).toHaveBeenCalledWith({ agentId: 'agent_1', amount: '1' });

    await tool.call('pocket_pay_for_resource', { agentId: 'agent_1', url: 'https://x.test' });
    expect(client.purchase).toHaveBeenCalled();

    await tool.call('pocket_create_task_budget', { agentId: 'agent_1', limit: '0.5' });
    expect(client.createTaskBudget).toHaveBeenCalledWith('agent_1', { limit: '0.5' });
  });

  it('builds a query string rather than handing the client an object', async () => {
    const client = {
      spendSummary: vi.fn().mockResolvedValue({}),
      listPayments: vi.fn().mockResolvedValue({}),
      audit: vi.fn().mockResolvedValue({}),
    };
    const tool = handlers(client);

    await tool.call('pocket_spend_summary', { agentId: 'agent_1', days: 7 });
    expect(client.spendSummary).toHaveBeenCalledWith('?days=7&agentId=agent_1');

    await tool.call('pocket_spend_summary', { days: 30 });
    expect(client.spendSummary).toHaveBeenCalledWith('?days=30');

    await tool.call('pocket_list_payments', { limit: 25, status: 'blocked', agentId: 'agent_1' });
    expect(client.listPayments).toHaveBeenCalledWith('?limit=25&agentId=agent_1&status=blocked');

    await tool.call('pocket_list_payments', { limit: 10 });
    expect(client.listPayments).toHaveBeenCalledWith('?limit=10');

    await tool.call('pocket_audit_trail', { limit: 50 });
    expect(client.audit).toHaveBeenCalledWith('?limit=50');
  });
});

describe('a refusal', () => {
  it("reaches the agent as a result carrying the API's own code", async () => {
    const client = {
      purchase: vi
        .fn()
        .mockRejectedValue(
          new PocketApiError(402, 'DAILY_BUDGET_EXCEEDED', 'No room left today.', { left: '0.03' }),
        ),
    };
    const result = await handlers(client).call('pocket_pay_for_resource', { agentId: 'a' });

    expect(payload(result)).toEqual({
      error: {
        code: 'DAILY_BUDGET_EXCEEDED',
        message: 'No room left today.',
        details: { left: '0.03' },
      },
    });
  });

  it('never throws, whatever went wrong', async () => {
    const client = { listAgents: vi.fn().mockRejectedValue(new Error('socket hang up')) };
    const result = await handlers(client).call('pocket_list_agents');

    expect(payload(result)).toMatchObject({ error: { code: 'MCP_TOOL_FAILED' } });
  });
});
