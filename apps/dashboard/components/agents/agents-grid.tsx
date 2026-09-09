'use client';

import { Bot } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { DURATION, EASE } from '@/lib/motion';
import type { AgentStatus, AgentSummary } from '@/lib/types';

import { AgentCard } from './agent-card';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'revoked', label: 'Revoked' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

/**
 * Filterable agent grid. Filtering and search happen client-side so the
 * surviving cards animate to their new positions instead of snapping.
 */
export function AgentsGrid({ agents }: { agents: AgentSummary[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const reduced = useReducedMotion();

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return agents.filter((agent) => {
      const statusMatch = filter === 'all' || agent.status === (filter as AgentStatus);
      const searchMatch =
        needle === '' ||
        agent.name.toLowerCase().includes(needle) ||
        (agent.description ?? '').toLowerCase().includes(needle) ||
        (agent.wallet?.address ?? '').toLowerCase().includes(needle);
      return statusMatch && searchMatch;
    });
  }, [agents, filter, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Filter agents by status"
          value={filter}
          options={FILTERS}
          onValueChange={setFilter}
        />
        <label className="sr-only" htmlFor="agent-search">
          Search agents
        </label>
        <Input
          id="agent-search"
          type="search"
          placeholder="Search name, description or wallet…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
        <p className="figures text-text-muted ml-auto text-xs">
          {visible.length} of {agents.length}
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents match"
          description="Adjust the status filter or clear the search to see more."
        />
      ) : (
        <motion.div layout={!reduced} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((agent) => (
              <motion.div
                key={agent.id}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.base, ease: EASE }}
              >
                <AgentCard agent={agent} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
