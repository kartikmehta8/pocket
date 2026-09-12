'use client';

/**
 * The filter bar, results and paging that make up the agents index.
 */

import { Bot } from 'lucide-react';
import { useId } from 'react';

import { Input } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { Pager } from '@/components/ui/pager';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import type { AgentSummary } from '@/lib/types';
import { useSearchNavigation } from '@/lib/use-search-navigation';

import { AgentCard } from './agent-card';

/** Props for {@link AgentsBrowser}. */
export interface AgentsBrowserProps {
  agents: AgentSummary[];
  /** Applied status filter, or `''` for all. */
  status: string;
  /** Applied search term, or `''`. */
  search: string;
  /** Cursor for the page after this one, or `null` on the last page. */
  nextCursor: string | null;
}

/** Sentinel used for "no filter" — Radix Select treats `''` as unset. */
const ANY = 'all';

const STATUS_OPTIONS = [
  { value: ANY, label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'revoked', label: 'Revoked' },
];

/**
 * Filter bar, results and paging for the agent list.
 *
 * @remarks Filtering and searching happen in the API, not in the browser, for
 * the same reason they do on Payments: a page narrowed after it arrives is a
 * page missing every match that fell on the other side of the cut.
 *
 * The search is submitted rather than typed into the URL on every keystroke.
 * A round trip per character would be a request per character, and the back
 * button would then walk through half-typed words.
 *
 * Remounted when the applied search changes, so the box agrees with the URL
 * after a back button or a cleared filter. An uncontrolled input keeps whatever
 * was typed otherwise.
 *
 * A search box that only reacts to Enter should say so, since the button it
 * would otherwise need is not worth the row it costs.
 */
export function AgentsBrowser({ agents, status, search, nextCursor }: AgentsBrowserProps) {
  const statusId = useId();
  const searchId = useId();
  const { apply, pageLinks, pending } = useSearchNavigation('/agents');
  const { onFirstPage, newest, older } = pageLinks(nextCursor);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:w-44 sm:flex-none">
          <label className="eyebrow" htmlFor={statusId}>
            Status
          </label>
          <Select
            id={statusId}
            value={status === '' ? ANY : status}
            options={STATUS_OPTIONS}
            onValueChange={(value) => apply('status', value, ANY)}
          />
        </div>

        <form
          className="flex min-w-56 flex-1 flex-col gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('q');
            apply('q', typeof value === 'string' ? value.trim() : '', '');
          }}
        >
          <label className="eyebrow" htmlFor={searchId}>
            Search
          </label>
          <Input
            key={search}
            id={searchId}
            name="q"
            type="search"
            placeholder="Name, description or wallet…"
            defaultValue={search}
            aria-describedby={`${searchId}-hint`}
          />
          <span id={`${searchId}-hint`} className="sr-only">
            Press Enter to search.
          </span>
        </form>

        <p className="figures text-text-muted pb-2.5 text-xs">
          {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
          {onFirstPage ? '' : ' on this page'}
        </p>
      </div>

      <div
        className={cn(
          'flex flex-col gap-4',
          'transition-opacity duration-(--duration-base) ease-(--ease-brand)',
          pending && 'opacity-60',
        )}
      >
        {agents.length === 0 ? (
          <div className="bg-surface border-border overflow-hidden rounded-lg border">
            <EmptyState
              icon={Bot}
              title="No agents match"
              description="Change the status filter or clear the search to see more."
            />
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}

        <Pager onFirstPage={onFirstPage} newest={newest} older={older} />
      </div>
    </div>
  );
}
