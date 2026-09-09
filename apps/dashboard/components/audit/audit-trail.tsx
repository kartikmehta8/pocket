'use client';

import { ScrollText } from 'lucide-react';
import { motion } from 'motion/react';

import { EmptyState } from '@/components/ui/empty-state';
import { denseStaggerContainer } from '@/lib/motion';
import type { AuditEvent } from '@/lib/types';

import { AuditRow } from './audit-row';

/**
 * The audit trail. Entries reveal with a 12ms stagger so a long page reads as
 * one wave rather than fifty separate animations; each row falls back to a
 * plain fade under `prefers-reduced-motion`.
 */
export function AuditTrail({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No audit events"
        description="Every policy decision, budget change and payment appears here."
      />
    );
  }

  return (
    <motion.div
      role="list"
      variants={denseStaggerContainer}
      initial="hidden"
      animate="shown"
      className="figures"
    >
      {events.map((event) => (
        <AuditRow key={event.id} event={event} />
      ))}
    </motion.div>
  );
}
