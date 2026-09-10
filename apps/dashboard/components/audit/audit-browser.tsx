'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { AUDIT_ACTIVITIES, AUDIT_ACTORS } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { humanize } from '@/lib/format';
import type { AuditEvent } from '@/lib/types';

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
  /** Which page this is, counting from one. */
  page: number;
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
 * @remarks The trail pages forward on a cursor, so "older" is the only way
 * on. "Newest" is offered on every later page as the way back, which matches
 * how the trail is read: from now, backwards, then back to now.
 */
export function AuditBrowser({
  events,
  agents,
  action,
  actorType,
  nextCursor,
  page,
}: AuditBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const href = (mutate: (params: URLSearchParams) => void): string => {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const queryString = next.toString();
    return queryString === '' ? '/audit' : `/audit?${queryString}`;
  };

  const apply = (key: string, value: string) => {
    const target = href((params) => {
      if (value === ANY) params.delete(key);
      else params.set(key, value);
      params.delete('cursor');
      params.delete('page');
    });
    startTransition(() => router.replace(target));
  };

  const newest = href((params) => {
    params.delete('cursor');
    params.delete('page');
  });
  const older =
    nextCursor === null
      ? null
      : href((params) => {
          params.set('cursor', nextCursor);
          params.set('page', String(page + 1));
        });

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
            onValueChange={(value) => apply('action', value)}
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
            onValueChange={(value) => apply('actorType', value)}
          />
        </div>
        <p className="figures text-text-muted pb-2.5 text-xs">
          {events.length} {events.length === 1 ? 'event' : 'events'}
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
        <AuditTable
          events={events}
          agents={agents}
          emptyTitle={
            action === '' && actorType === '' && page === 1
              ? 'No audit events'
              : 'No events match these filters'
          }
        />

        {page > 1 || older !== null ? (
          <div className="border-divider flex items-center justify-between gap-2 border-t px-4 py-3">
            {page > 1 ? (
              <Button asChild size="sm">
                <Link href={newest}>
                  <ArrowLeft aria-hidden className="size-3.5" strokeWidth={2} />
                  Newest
                </Link>
              </Button>
            ) : (
              // Holds the left slot, so "Older" stays on the right on page one.
              <span />
            )}
            {older !== null ? (
              <Button asChild size="sm">
                <Link href={older}>
                  Older
                  <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
                </Link>
              </Button>
            ) : (
              <span className="text-text-muted text-xs">Start of the record</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
