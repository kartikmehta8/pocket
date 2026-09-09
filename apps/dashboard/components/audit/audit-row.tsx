'use client';

import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { formatPrecise, humanize } from '@/lib/format';
import { DURATION, EASE, fade, staggerItem } from '@/lib/motion';
import { actorPresentation } from '@/lib/status';
import type { AuditEvent } from '@/lib/types';

/**
 * One audit entry: timestamp, actor badge, action, subject, and the raw JSON
 * payload behind a disclosure.
 */
export function AuditRow({ event }: { event: AuditEvent }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const panelId = useId();
  const actor = actorPresentation(event.actorType);
  const hasPayload = Object.keys(event.payload).length > 0;

  return (
    <motion.div
      role="listitem"
      variants={reduced ? fade : staggerItem}
      className="border-divider border-b last:border-0"
    >
      <div className="hover:bg-ash-25 flex items-center gap-3 px-4 py-2 transition-colors duration-(--duration-fast) ease-(--ease-brand)">
        <time
          dateTime={event.createdAt}
          className="figures text-2xs text-text-muted w-40 shrink-0 font-mono"
        >
          {formatPrecise(event.createdAt)}
        </time>
        <Badge
          tone={actor.tone}
          icon={actor.Icon}
          hint={actor.hint}
          className="w-20 shrink-0 justify-center"
        >
          {actor.label}
        </Badge>
        <span className="text-text w-56 shrink-0 truncate font-mono text-xs font-medium">
          {event.action}
        </span>
        <span className="text-text-secondary min-w-0 flex-1 truncate text-xs">
          {humanize(event.subjectType)}
          {event.subjectId ? (
            <span className="text-2xs text-text-muted ml-1.5 font-mono">{event.subjectId}</span>
          ) : null}
        </span>
        {event.actorId ? (
          <span className="text-2xs text-text-muted hidden shrink-0 font-mono lg:inline">
            {event.actorId}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={panelId}
          disabled={!hasPayload}
          aria-label={`${open ? 'Hide' : 'Show'} payload for ${event.action}`}
          className="text-ash-400 hover:bg-ash-100 hover:text-text inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm disabled:cursor-default disabled:opacity-30"
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
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="overflow-hidden"
          >
            <pre className="bg-ash-25 text-2xs text-text-secondary overflow-x-auto px-4 py-3 font-mono leading-relaxed">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
