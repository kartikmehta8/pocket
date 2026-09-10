'use client';

import { useMemo } from 'react';

import { Pager } from '@/components/ui/pager';
import { Select } from '@/components/ui/select';
import { PAYMENT_STATUSES } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { humanize } from '@/lib/format';
import type { AgentSummary, Payment } from '@/lib/types';
import { useSearchNavigation } from '@/lib/use-search-navigation';

import { PaymentsTable } from './payments-table';

/** Props for {@link PaymentsBrowser}. */
export interface PaymentsBrowserProps {
  payments: Payment[];
  agents: AgentSummary[];
  /** Applied `agentId` filter, or `''` for all. */
  agentId: string;
  /** Applied `status` filter, or `''` for all. */
  status: string;
  /** Cursor for the page after this one, or `null` on the last page. */
  nextCursor: string | null;
  /** Which page this is, counting from one. */
  page: number;
}

/** Sentinel used for "no filter" — Radix Select treats `''` as unset. */
const ANY = 'all';

const STATUS_OPTIONS = [
  { value: ANY, label: 'All statuses' },
  ...PAYMENT_STATUSES.map((status) => ({ value: status, label: humanize(status) })),
];

/**
 * Filter bar, results and paging for the payment history.
 *
 * Both filters are applied by the API and carried in the URL, so a filtered
 * page is a full page and the link can be shared. Changing a filter starts
 * again from the newest payment: a cursor from one view means nothing in
 * another.
 */
export function PaymentsBrowser({
  payments,
  agents,
  agentId,
  status,
  nextCursor,
  page,
}: PaymentsBrowserProps) {
  const { apply, pageLinks, pending } = useSearchNavigation('/payments');
  const { newest, older } = pageLinks(nextCursor, page);

  const agentOptions = useMemo(
    () => [
      { value: ANY, label: 'All agents' },
      ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
    ],
    [agents],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:w-44 sm:flex-none">
          <label className="eyebrow" htmlFor="filter-agent">
            Agent
          </label>
          <Select
            id="filter-agent"
            value={agentId === '' ? ANY : agentId}
            options={agentOptions}
            onValueChange={(value) => apply('agentId', value, ANY)}
          />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:w-44 sm:flex-none">
          <label className="eyebrow" htmlFor="filter-status">
            Status
          </label>
          <Select
            id="filter-status"
            value={status === '' ? ANY : status}
            options={STATUS_OPTIONS}
            onValueChange={(value) => apply('status', value, ANY)}
          />
        </div>
        <p className="figures text-text-muted pb-2.5 text-xs">
          {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
          {page > 1 || older !== null ? ` · page ${page}` : ''}
        </p>
      </div>

      <div
        className={cn(
          'bg-surface border-border overflow-hidden rounded-lg border',
          'transition-opacity duration-(--duration-base) ease-(--ease-brand)',
          pending && 'opacity-60',
        )}
      >
        <PaymentsTable
          payments={payments}
          emptyTitle={
            agentId === '' && status === '' && page === 1
              ? 'No payments yet'
              : 'No payments match these filters'
          }
        />
        <Pager page={page} newest={newest} older={older} />
      </div>
    </div>
  );
}
