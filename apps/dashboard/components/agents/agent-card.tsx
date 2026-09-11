import { ArrowUpRight, Wallet } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { Meter } from '@/components/ui/meter';
import { cn } from '@/lib/cn';
import { formatAmount, truncateAddress, usageRatio } from '@/lib/format';
import { agentStatusPresentation } from '@/lib/status';
import type { AgentSummary } from '@/lib/types';

/** One figure beneath an agent's name. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow">{label}</p>
      <p className="figures text-text mt-0.5 truncate text-sm font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

/**
 * One agent at a glance: status, wallet, today's spend and how much of the
 * daily allowance is gone.
 *
 * @remarks A revoked agent is dimmed rather than hidden. It cannot spend, its
 * figures are history, and reading it at full strength beside a working agent
 * invites acting on numbers that stopped moving.
 */
export function AgentCard({ agent }: { agent: AgentSummary }) {
  const status = agentStatusPresentation(agent.status);
  const asset = agent.budget?.asset ?? 'USDC';
  const retired = agent.status === 'revoked';

  return (
    <article
      className={cn(
        'bg-surface border-border flex h-full flex-col gap-3 rounded-lg border p-4',
        'hover:shadow-pop-sm transition-shadow duration-(--duration-base) ease-(--ease-brand)',
        retired && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/agents/${agent.id}`}
            className="text-text hover:text-accent-700 inline-flex max-w-full items-center gap-1 rounded-sm font-semibold tracking-tight"
          >
            <span className="truncate">{agent.name}</span>
            <ArrowUpRight aria-hidden className="text-ash-400 size-3.5 shrink-0" strokeWidth={2} />
          </Link>
          <p className="text-text-muted mt-0.5 line-clamp-2 text-xs leading-relaxed">
            {agent.description ?? 'No description'}
          </p>
        </div>
        <Badge tone={status.tone} icon={status.Icon} hint={status.hint}>
          {status.label}
        </Badge>
      </div>

      <div className="text-text-secondary flex min-w-0 items-center gap-1.5 text-xs">
        <Wallet aria-hidden className="text-ash-400 size-3.5 shrink-0" strokeWidth={1.75} />
        {agent.wallet ? (
          <>
            <span className="figures truncate font-mono" title={agent.wallet.address}>
              {truncateAddress(agent.wallet.address)}
            </span>
            <CopyButton value={agent.wallet.address} label={`${agent.name} wallet address`} />
            <span className="text-text-muted ml-auto shrink-0">{agent.wallet.chain}</span>
          </>
        ) : (
          <span className="text-text-muted">No wallet provisioned</span>
        )}
      </div>

      <div className="border-divider mt-auto grid grid-cols-2 gap-3 border-t pt-3">
        <Stat label="Spend today" value={formatAmount(agent.spend.today, asset)} />
        <Stat label="Payments" value={String(agent.spend.paymentCount)} />
      </div>

      {agent.budget ? (
        <Meter
          ratio={usageRatio(agent.spend.today, agent.budget.dailyLimit)}
          label={`${agent.name} daily budget used`}
          valueText={`${formatAmount(agent.spend.dailyRemaining, asset)} left of ${formatAmount(agent.budget.dailyLimit, null)} today`}
        />
      ) : (
        <p className="text-text-muted text-xs leading-relaxed">
          No daily budget, so every payment is refused.
        </p>
      )}
    </article>
  );
}
