import { Wallet } from 'lucide-react';

import { CopyButton } from '@/components/ui/copy-button';
import { formatAmount, truncateAddress } from '@/lib/format';
import type { AgentDetail } from '@/lib/types';

import { AgentStatusControl } from './agent-status-control';

/**
 * Agent detail masthead: name, description, the status control, and the
 * wallet address beside its live balance.
 */
export function AgentHeader({ detail }: { detail: AgentDetail }) {
  const { agent, balance } = detail;

  return (
    <header className="bg-surface shadow-e1 ring-border flex flex-col gap-4 rounded-lg p-5 ring-1 ring-inset">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-1">Agent</p>
          <h1 className="text-text text-xl font-semibold tracking-tight">{agent.name}</h1>
          <p className="text-text-muted mt-1 max-w-prose text-sm">
            {agent.description ?? 'No description'}
          </p>
        </div>
        <AgentStatusControl agentId={agent.id} status={agent.status} />
      </div>

      <div className="border-divider flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4">
        <div className="flex items-center gap-2">
          <Wallet aria-hidden className="text-ash-400 size-3.5" strokeWidth={1.75} />
          {agent.wallet ? (
            <>
              <span className="figures text-text-secondary font-mono text-xs">
                {truncateAddress(agent.wallet.address, 10, 8)}
              </span>
              <CopyButton value={agent.wallet.address} label="wallet address" />
              <span className="text-text-muted text-xs">{agent.wallet.chain}</span>
            </>
          ) : (
            <span className="text-text-muted text-xs">No wallet provisioned</span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="eyebrow">Balance</span>
          <span className="figures text-text text-sm font-semibold">
            {balance ? formatAmount(balance.amount, balance.asset) : 'Unknown'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="eyebrow">Spend today</span>
          <span className="figures text-text text-sm font-semibold">
            {formatAmount(agent.spend.today, agent.budget?.asset ?? null)}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="eyebrow">Payments</span>
          <span className="figures text-text text-sm font-semibold">
            {agent.spend.paymentCount}
          </span>
        </div>
      </div>
    </header>
  );
}
