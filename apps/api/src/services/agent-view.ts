/**
 * Agent summaries for the dashboard and MCP.
 *
 * A summary joins an agent to the three things an operator always wants to see
 * next to it: where its money is, how much it may spend, and how much of that
 * is left today.
 */

import { decimalsOf, formatAmount, isAssetId, remaining, type Agent } from '@pocket/core';
import {
  countSpendToday,
  getAgentBundle,
  listAgents,
  sumSpendToday,
  type AgentFilter,
  type Database,
} from '@pocket/db';

/** JSON shape of an agent summary, as the API promises it. */
export interface AgentSummaryJson {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  wallet: { address: string; chain: string } | null;
  budget: { asset: string; dailyLimit: string; perTransactionLimit: string } | null;
  spend: { today: string; dailyRemaining: string; paymentCount: number };
}

function format(amount: bigint, asset: string): string {
  return isAssetId(asset) ? formatAmount(amount, decimalsOf(asset)) : amount.toString();
}

/**
 * Builds one agent summary.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param agent - The agent to summarise.
 * @returns The summary, with zeroed spend when no budget is configured.
 */
export async function summariseAgent(
  db: Database,
  orgId: string,
  agent: Agent,
): Promise<AgentSummaryJson> {
  const bundle = await getAgentBundle(db, orgId, agent.id);
  const budget = bundle?.budget ?? null;
  const asset = budget?.asset ?? 'USDC';
  const [spentToday, paymentCount] = await Promise.all([
    sumSpendToday(db, agent.id, asset),
    countSpendToday(db, agent.id, asset),
  ]);

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    status: agent.status,
    createdAt: agent.createdAt.toISOString(),
    wallet:
      bundle?.wallet == null
        ? null
        : { address: bundle.wallet.address, chain: bundle.wallet.chain },
    budget:
      budget === null
        ? null
        : {
            asset: budget.asset,
            dailyLimit: format(budget.dailyLimit, budget.asset),
            perTransactionLimit: format(budget.perTransactionLimit, budget.asset),
          },
    spend: {
      today: format(spentToday, asset),
      dailyRemaining:
        budget === null ? '0' : format(remaining(budget.dailyLimit, spentToday), budget.asset),
      paymentCount,
    },
  };
}

/**
 * Summarises every agent in an organization.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @returns Summaries in creation order.
 */
export async function summariseAllAgents(
  db: Database,
  orgId: string,
  filter: AgentFilter = {},
): Promise<{ agents: AgentSummaryJson[]; nextCursor: string | null }> {
  const page = await listAgents(db, orgId, filter);
  return {
    agents: await Promise.all(page.agents.map((agent) => summariseAgent(db, orgId, agent))),
    nextCursor: page.nextCursor,
  };
}
