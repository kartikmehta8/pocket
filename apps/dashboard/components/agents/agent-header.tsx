'use client';

import { Pencil, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { formatAmount, truncateAddress, usageRatio } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { AgentDetail, AgentSummary } from '@/lib/types';

import { AgentDeleteDialog } from './agent-delete-dialog';
import { AgentEditDialog } from './agent-edit-dialog';
import { AgentStatusControl } from './agent-status-control';

/** One figure in the row beneath the agent's name. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-2xs font-medium tracking-wide text-white/60 uppercase">{label}</p>
      <p className="figures mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

/** Props for {@link AgentHeader}. */
export interface AgentHeaderProps {
  detail: AgentDetail;
  /** Every other agent in the organization, as somewhere to move funds to. */
  others: AgentSummary[];
}

/**
 * The agent at a glance: who it is, whether it may spend, what it holds, and
 * how much of today's allowance is gone.
 *
 * @remarks The blue panel the landing page closes on. This is the one card on
 * the page that says what the agent *is* rather than how it is configured, and
 * the status control belongs to it: pausing an agent is the fastest thing an
 * operator ever needs to do here, and it should never be hunted for.
 */
export function AgentHeader({ detail, others }: AgentHeaderProps) {
  const { agent, balance } = detail;
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const asset = agent.budget?.asset ?? 'USDC';
  const ratio = usageRatio(agent.spend.today, agent.budget?.dailyLimit);

  return (
    <>
      <header className="border-border bg-accent-600 shadow-pop overflow-hidden rounded-lg border">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-2xs font-medium tracking-wide text-white/60 uppercase">Agent</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                {agent.name}
              </h1>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-white/75">
                {agent.description ?? 'No description'}
              </p>
            </div>
            {/* Left-aligned under the description on a phone, where wrapping
                a right-aligned column leaves the status control and the
                buttons on different edges. */}
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <AgentStatusControl agentId={agent.id} status={agent.status} />
              <div className="-ml-2.5 flex items-center gap-1 sm:ml-0">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Pencil}
                  onClick={() => setEditing(true)}
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  onClick={() => setDeleting(true)}
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>

          {agent.wallet === null ? (
            <p className="flex items-center gap-2 text-xs text-white/75">
              <Wallet aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
              No wallet provisioned
            </p>
          ) : (
            // Separators lead their item rather than trailing the one before,
            // so a line that wraps takes its separator with it instead of
            // leaving a stranded dot at the end.
            <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/75 [&>li+li]:before:mr-2 [&>li+li]:before:text-white/50 [&>li+li]:before:content-['·']">
              <li className="flex min-w-0 items-center gap-1.5">
                <Wallet aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
                <span className="figures truncate font-mono" title={agent.wallet.address}>
                  {truncateAddress(agent.wallet.address, 10, 8)}
                </span>
                <CopyButton
                  value={agent.wallet.address}
                  label="wallet address"
                  className="text-white/60 hover:bg-white/10 hover:text-white"
                />
              </li>
              <li>{agent.wallet.chain}</li>
              {detail.accountId === null ? null : (
                <li className="figures font-mono">{detail.accountId}</li>
              )}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-white/20 bg-white/5 p-5 sm:grid-cols-4 sm:px-6">
          <Stat
            label="Balance"
            value={balance ? formatAmount(balance.amount, balance.asset) : 'Unknown'}
          />
          <Stat label="Spend today" value={formatAmount(agent.spend.today, asset)} />
          <Stat
            label="Daily limit"
            value={
              agent.budget ? formatAmount(agent.budget.dailyLimit, agent.budget.asset) : 'Not set'
            }
          />
          <Stat label="Payments" value={String(agent.spend.paymentCount)} />

          {agent.budget ? (
            <div className="col-span-2 sm:col-span-4">
              {/* The theme's meter is built for a light surface, so the bar is
                  drawn here rather than borrowed: on this panel its track and
                  its caption would both disappear. */}
              <div
                role="progressbar"
                aria-label={`${agent.name} daily budget used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ratio * 100)}
                className="h-1.5 w-full overflow-hidden rounded-full bg-white/20"
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-(--duration-slow) ease-(--ease-brand)',
                    ratio >= 1 ? 'bg-warning' : 'bg-white',
                  )}
                  style={{ width: `${Math.min(100, ratio * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-white/70">
                {formatAmount(agent.spend.dailyRemaining, asset)} left today. Resets at midnight
                UTC.
              </p>
            </div>
          ) : (
            <p className="col-span-2 text-xs leading-relaxed text-white/70 sm:col-span-4">
              No budget set, so every payment is refused. Set one below.
            </p>
          )}
        </div>
      </header>

      <AgentEditDialog agent={agent} open={editing} onOpenChange={setEditing} />

      <AgentDeleteDialog
        agent={agent}
        balance={balance}
        others={others}
        open={deleting}
        onOpenChange={setDeleting}
      />
    </>
  );
}
