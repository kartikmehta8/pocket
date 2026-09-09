import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { Meter } from '@/components/ui/meter';
import { formatAmount, truncateAddress, usageRatio } from '@/lib/format';
import { agentStatusPresentation } from '@/lib/status';
import type { AgentSummary } from '@/lib/types';

/**
 * One agent at a glance: status, wallet, today's spend and how much of the
 * daily allowance is gone.
 */
export function AgentCard({ agent }: { agent: AgentSummary }) {
  const status = agentStatusPresentation(agent.status);
  const asset = agent.budget?.asset ?? 'USDC';
  const ratio = usageRatio(agent.spend.today, agent.budget?.dailyLimit);

  return (
    <article className="bg-surface ring-border hover:shadow-pop-sm flex h-full flex-col gap-4 rounded-lg p-4 ring-1 transition-shadow duration-(--duration-base) ease-(--ease-brand) ring-inset">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/agents/${agent.id}`}
            className="text-text hover:text-accent-700 inline-flex items-center gap-1 rounded-sm text-sm font-semibold tracking-tight"
          >
            {agent.name}
            <ArrowUpRight aria-hidden className="text-ash-400 size-3.5" strokeWidth={2} />
          </Link>
          <p className="text-text-muted mt-0.5 line-clamp-2 text-xs">
            {agent.description ?? 'No description'}
          </p>
        </div>
        <Badge tone={status.tone} icon={status.Icon} hint={status.hint}>
          {status.label}
        </Badge>
      </div>

      <div className="text-text-secondary flex min-h-6 items-center gap-1 text-xs">
        {agent.wallet ? (
          <>
            <span className="figures font-mono">{truncateAddress(agent.wallet.address)}</span>
            <CopyButton value={agent.wallet.address} label={`${agent.name} wallet address`} />
            <span className="text-text-muted ml-auto">{agent.wallet.chain}</span>
          </>
        ) : (
          <span className="text-text-muted">No wallet provisioned</span>
        )}
      </div>

      <div className="border-divider mt-auto grid grid-cols-2 gap-3 border-t pt-3">
        <div>
          <p className="eyebrow">Spend today</p>
          <p className="figures text-md text-text mt-0.5 font-semibold tracking-tight">
            {formatAmount(agent.spend.today, asset)}
          </p>
        </div>
        <div>
          <p className="eyebrow">Payments</p>
          <p className="figures text-md text-text mt-0.5 font-semibold tracking-tight">
            {agent.spend.paymentCount}
          </p>
        </div>
      </div>

      {agent.budget ? (
        <Meter
          ratio={ratio}
          label={`${agent.name} daily budget used`}
          valueText={`${formatAmount(agent.spend.today, null)} of ${formatAmount(agent.budget.dailyLimit, asset)} daily · ${formatAmount(agent.spend.dailyRemaining, null)} left`}
        />
      ) : (
        <p className="text-text-muted text-xs">No daily budget set</p>
      )}
    </article>
  );
}
