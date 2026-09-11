'use client';

import { Pager } from '@/components/ui/pager';
import { Select } from '@/components/ui/select';
import { AUDIT_ACTIVITIES, AUDIT_ACTORS } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { humanize } from '@/lib/format';
import type { AuditEvent } from '@/lib/types';
import { useSearchNavigation } from '@/lib/use-search-navigation';

import { AuditTable } from './audit-table';

/** Props for {@link AuditBrowser}. */
export interface AuditBrowserProps {
  events: AuditEvent[];
  /** Agent names by id, so the trail can say who rather than which. */
  agents: Record<string, string>;
  /** Applied action family, or `''` for all. */
  action: string;
  /** Applied actor type, or `''` for all. */
  actorType: string;
  /** Cursor for the page after this one, or `null` on the last page. */
  nextCursor: string | null;
}

/** Sentinel used for "no filter" — Radix Select treats `''` as unset. */
const ANY = 'all';

const ACTIVITY_OPTIONS = [{ value: ANY, label: 'All activity' }, ...AUDIT_ACTIVITIES];

const ACTOR_OPTIONS = [
  { value: ANY, label: 'Anyone' },
  ...AUDIT_ACTORS.map((actor) => ({ value: actor, label: humanize(actor) })),
];

/**
 * Filter bar, results and paging for the audit trail.
 *
 * Both filters are applied by the API and carried in the URL, so a filtered
 * page is a full page and the link can be shared. Changing a filter starts
 * again from the newest event: a cursor from one view means nothing in another.
 *
 */
export function AuditBrowser({ events, agents, action, actorType, nextCursor }: AuditBrowserProps) {
  const { apply, pageLinks, pending } = useSearchNavigation('/audit');
  const { onFirstPage, newest, older } = pageLinks(nextCursor);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:w-44 sm:flex-none">
          <label className="eyebrow" htmlFor="filter-activity">
            Activity
          </label>
          <Select
            id="filter-activity"
            value={action === '' ? ANY : action}
            options={ACTIVITY_OPTIONS}
            onValueChange={(value) => apply('action', value, ANY)}
          />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:w-44 sm:flex-none">
          <label className="eyebrow" htmlFor="filter-actor">
            Actor
          </label>
          <Select
            id="filter-actor"
            value={actorType === '' ? ANY : actorType}
            options={ACTOR_OPTIONS}
            onValueChange={(value) => apply('actorType', value, ANY)}
          />
        </div>
        <p className="figures text-text-muted pb-2.5 text-xs">
          {events.length} {events.length === 1 ? 'event' : 'events'}
          {onFirstPage ? '' : ' on this page'}
        </p>
      </div>

      <div
        className={cn(
          'bg-surface border-border overflow-hidden rounded-lg border',
          'transition-opacity duration-(--duration-base) ease-(--ease-brand)',
          pending && 'opacity-60',
        )}
      >
        <AuditTable
          events={events}
          agents={agents}
          emptyTitle={
            action === '' && actorType === '' && onFirstPage
              ? 'No audit events'
              : 'No events match these filters'
          }
        />

        <Pager
          onFirstPage={onFirstPage}
          newest={newest}
          older={older}
          className="border-divider border-t px-4 py-3"
        />
      </div>
    </div>
  );
}
