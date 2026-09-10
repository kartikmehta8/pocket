'use client';

import { ChevronRight, ScrollText } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { CodeBlock } from '@/components/ui/code-block';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableFrame, TBody, TD, TH, THead } from '@/components/ui/table';
import { cn } from '@/lib/cn';
import { agentIdOf, describeEvent } from '@/lib/audit';
import { formatDateTime, formatPrecise } from '@/lib/format';
import { DURATION, EASE } from '@/lib/motion';
import { actorPresentation } from '@/lib/status';
import type { AuditEvent } from '@/lib/types';

/** Columns in the table, for the expanded row to span. */
const COLUMNS = 6;

/** Whether an event records money being stopped, which earns it a tinted row. */
function isRefusal(event: AuditEvent): boolean {
  return /\.(blocked|rejected|failed)$/.test(event.action);
}

/** Whether there is anything behind the disclosure. */
function hasPayload(event: AuditEvent): boolean {
  return Object.keys(event.payload).length > 0;
}

/**
 * The raw event behind a row: its id, and the payload as the API recorded it.
 *
 * @param event The event.
 * @remarks Wrapped rather than scrolled sideways. A payload can carry a long
 * address or URL, and inside a table that is already scrolling horizontally a
 * second scrollbar is one too many.
 */
function AuditDetail({ event }: { event: AuditEvent }) {
  return (
    <div className="bg-ash-25 flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="text-text-muted">
          <time dateTime={event.createdAt} className="figures text-text-secondary font-mono">
            {formatPrecise(event.createdAt)} UTC
          </time>
        </span>
        <span className="text-text-muted inline-flex items-center gap-1">
          Event
          <span className="figures text-text-secondary font-mono">{event.id}</span>
          <CopyButton value={event.id} label="event id" />
        </span>
        {event.actorId ? (
          <span className="text-text-muted inline-flex items-center gap-1">
            By
            <span className="figures text-text-secondary font-mono">{event.actorId}</span>
            <CopyButton value={event.actorId} label="actor id" />
          </span>
        ) : null}
      </div>
      <CodeBlock
        wrap
        code={JSON.stringify(event.payload, null, 2)}
        label={`${event.action} payload`}
        caption="Payload"
        className="bg-surface max-h-72 overflow-y-auto"
      />
    </div>
  );
}

/** The disclosure control, shared by the table row and the phone-width card. */
function ExpandButton({
  open,
  disabled,
  action,
  onClick,
}: {
  open: boolean;
  disabled: boolean;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      disabled={disabled}
      aria-label={`${open ? 'Hide' : 'Show'} payload for ${action}`}
      className="text-ash-400 hover:bg-ash-100 hover:text-text inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <ChevronRight
        aria-hidden
        className={cn(
          'size-4 transition-transform duration-(--duration-fast) ease-(--ease-brand)',
          open && 'rotate-90',
        )}
        strokeWidth={2}
      />
    </button>
  );
}

/** What one row needs to know, whichever shape it takes. */
interface RowProps {
  event: AuditEvent;
  agents: Record<string, string>;
  open: boolean;
  onToggle: () => void;
}

/**
 * One event at phone width: stacked, wrapping, with nothing to scroll sideways
 * for. The payload opens beneath at full width.
 */
function EventCard({ event, agents, open, onToggle }: RowProps) {
  const reduced = useReducedMotion();
  const actor = actorPresentation(event.actorType);
  const agentId = agentIdOf(event);
  return (
    <li
      className={cn(
        '[&+li]:border-divider [&+li]:border-t',
        isRefusal(event) ? 'bg-danger-soft/50' : 'bg-surface',
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={actor.tone} icon={actor.Icon} hint={actor.hint}>
              {actor.label}
            </Badge>
            <code className="text-text font-mono text-xs font-medium break-all">
              {event.action}
            </code>
          </div>
          <p className="text-text-secondary text-sm leading-snug break-words">
            {describeEvent(event)}
          </p>
          <p className="text-text-muted flex flex-wrap items-center gap-x-2 text-xs">
            <time dateTime={event.createdAt} title={formatPrecise(event.createdAt)}>
              {formatDateTime(event.createdAt)}
            </time>
            {agentId === null ? null : (
              <>
                <span aria-hidden>·</span>
                <Link
                  href={`/agents/${agentId}`}
                  className="text-text hover:text-accent-700 rounded-sm font-medium"
                >
                  {agents[agentId] ?? agentId}
                </Link>
              </>
            )}
          </p>
        </div>
        <ExpandButton
          open={open}
          disabled={!hasPayload(event)}
          action={event.action}
          onClick={onToggle}
        />
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="detail"
            initial={reduced ? false : { height: 0 }}
            animate={{ height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { height: 0 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="overflow-hidden"
          >
            <AuditDetail event={event} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

/**
 * One event as a table row, with the raw payload in a row of its own beneath
 * it while open.
 *
 * @remarks The last row drops its divider so it does not double up with the
 * border of whatever follows the table.
 */
function EventRow({ event, agents, open, onToggle }: RowProps) {
  const reduced = useReducedMotion();
  const actor = actorPresentation(event.actorType);
  const agentId = agentIdOf(event);
  const details = describeEvent(event);
  return (
    <>
      <tr
        className={cn(
          '[&>td]:border-divider [&:last-child>td]:border-b-0 [&>td]:border-b',
          'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
          isRefusal(event) ? 'bg-danger-soft/50 hover:bg-danger-soft' : 'hover:bg-ash-25',
        )}
      >
        <TD className="text-text-secondary whitespace-nowrap">
          {/* Readable in the row; the exact instant on hover and in the panel. */}
          <time dateTime={event.createdAt} title={formatPrecise(event.createdAt)}>
            {formatDateTime(event.createdAt)}
          </time>
        </TD>
        <TD>
          <Badge tone={actor.tone} icon={actor.Icon} hint={actor.hint}>
            {actor.label}
          </Badge>
        </TD>
        <TD>
          <code className="text-text font-mono text-xs font-medium">{event.action}</code>
        </TD>
        <TD>
          {agentId === null ? (
            <span className="text-text-muted">—</span>
          ) : (
            <Link
              href={`/agents/${agentId}`}
              className="text-text hover:text-accent-700 rounded-sm font-medium whitespace-nowrap"
            >
              {agents[agentId] ?? agentId}
            </Link>
          )}
        </TD>
        <TD className="text-text-secondary">
          <span className="block max-w-[26rem] truncate" title={details}>
            {details}
          </span>
        </TD>
        <TD numeric>
          <ExpandButton
            open={open}
            disabled={!hasPayload(event)}
            action={event.action}
            onClick={onToggle}
          />
        </TD>
      </tr>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.tr
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE }}
            className="[&>td]:border-divider [&:last-child>td]:border-b-0 [&>td]:border-b"
          >
            <td colSpan={COLUMNS} className="p-0">
              <motion.div
                initial={reduced ? false : { height: 0 }}
                animate={{ height: 'auto' }}
                exit={reduced ? { opacity: 0 } : { height: 0 }}
                transition={{ duration: DURATION.base, ease: EASE }}
                className="overflow-hidden"
              >
                <AuditDetail event={event} />
              </motion.div>
            </td>
          </motion.tr>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Props for {@link AuditTable}. */
export interface AuditTableProps {
  events: AuditEvent[];
  /** Agent names by id. An agent no longer listed shows as its id. */
  agents: Record<string, string>;
  /** Message shown when the list is empty. */
  emptyTitle?: string;
}

/**
 * The audit trail, one entry per event, with the raw payload behind a
 * disclosure.
 *
 * @remarks One entry open at a time, as on Payments. Several open payloads
 * turned the page into a wall of JSON with the rows lost between them.
 * Refusals and failures carry a tinted row, so they can be found without
 * reading every action name.
 *
 * Below the `md` breakpoint the events render as stacked cards rather than a
 * table. Six columns on a phone meant a table three screens wide, scrolled
 * sideways, with the payload panel stretched across all of it.
 */
export function AuditTable({ events, agents, emptyTitle = 'No audit events' }: AuditTableProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title={emptyTitle}
        description="Every policy decision, budget change and payment appears here."
      />
    );
  }

  const rowProps = (event: AuditEvent): RowProps => ({
    event,
    agents,
    open: openId === event.id,
    onToggle: () => setOpenId(openId === event.id ? null : event.id),
  });

  return (
    <>
      <ul className="md:hidden">
        {events.map((event) => (
          <EventCard key={event.id} {...rowProps(event)} />
        ))}
      </ul>

      <TableFrame className="hidden md:block">
        <Table>
          <THead>
            <TH>When</TH>
            <TH>Actor</TH>
            <TH>Action</TH>
            <TH>Agent</TH>
            <TH>Details</TH>
            <TH className="sr-only">Expand</TH>
          </THead>
          <TBody>
            {events.map((event) => (
              <EventRow key={event.id} {...rowProps(event)} />
            ))}
          </TBody>
        </Table>
      </TableFrame>
    </>
  );
}
