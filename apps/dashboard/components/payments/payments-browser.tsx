'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { Input } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { PAYMENT_STATUSES } from '@/lib/catalog';
import { humanize } from '@/lib/format';
import type { AgentSummary, Payment } from '@/lib/types';

import { PaymentsTable } from './payments-table';

/** Props for {@link PaymentsBrowser}. */
export interface PaymentsBrowserProps {
  payments: Payment[];
  agents: AgentSummary[];
  /** Currently applied `agentId` filter, or `''` for all. */
  agentId: string;
  /** Currently applied `status` filter, or `''` for all. */
  status: string;
}

/** Sentinel used for "no filter" — Radix Select treats `''` as unset. */
const ANY = 'all';

const STATUS_OPTIONS = [
  { value: ANY, label: 'All statuses' },
  ...PAYMENT_STATUSES.map((status) => ({ value: status, label: humanize(status) })),
];

/**
 * Filter bar plus results. Agent and status are server-side filters carried in
 * the URL, matching `GET /v1/payments`; the free-text search narrows the
 * fetched page client-side so the surviving rows animate into place.
 */
export function PaymentsBrowser({ payments, agents, agentId, status }: PaymentsBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');

  const agentOptions = useMemo(
    () => [
      { value: ANY, label: 'All agents' },
      ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
    ],
    [agents],
  );

  const apply = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === ANY) next.delete(key);
    else next.set(key, value);
    const queryString = next.toString();
    startTransition(() =>
      router.replace(queryString === '' ? '/payments' : `/payments?${queryString}`),
    );
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle === '') return payments;
    return payments.filter(
      (payment) =>
        payment.reason.toLowerCase().includes(needle) ||
        payment.recipient.toLowerCase().includes(needle) ||
        payment.agentName.toLowerCase().includes(needle) ||
        (payment.denialCode ?? '').toLowerCase().includes(needle),
    );
  }, [payments, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-44 flex-col gap-1.5">
          <label className="eyebrow" htmlFor="filter-agent">
            Agent
          </label>
          <Select
            id="filter-agent"
            value={agentId === '' ? ANY : agentId}
            options={agentOptions}
            onValueChange={(value) => apply('agentId', value)}
          />
        </div>
        <div className="flex w-44 flex-col gap-1.5">
          <label className="eyebrow" htmlFor="filter-status">
            Status
          </label>
          <Select
            id="filter-status"
            value={status === '' ? ANY : status}
            options={STATUS_OPTIONS}
            onValueChange={(value) => apply('status', value)}
          />
        </div>
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label className="eyebrow" htmlFor="filter-search">
            Search
          </label>
          <Input
            id="filter-search"
            type="search"
            placeholder="Reason, recipient, agent or denial code…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <p className="figures text-text-muted pb-2.5 text-xs">
          {visible.length} of {payments.length}
        </p>
      </div>

      <div
        className={cn(
          'bg-surface border-border overflow-hidden rounded-lg border',
          'transition-opacity duration-(--duration-base) ease-(--ease-brand)',
          pending && 'opacity-60',
        )}
      >
        <PaymentsTable payments={visible} emptyTitle="No payments match these filters" />
      </div>
    </div>
  );
}
