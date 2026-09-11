'use client';

import { useState, useTransition } from 'react';

import { Segmented } from '@/components/ui/segmented';
import { setAgentStatusAction } from '@/lib/actions';
import type { AgentStatus } from '@/lib/types';

const OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'revoked', label: 'Revoked' },
] as const;

/**
 * Segmented control that switches an agent between active, paused and revoked.
 * The change is optimistic in the UI and confirmed by the server action's
 * announced result.
 */
/**
 * Active, paused or revoked, changed in one press.
 *
 * @remarks Optimistic: the new state shows immediately and reverts if the API
 * refuses, because pausing an agent is something people do when they are
 * already worried and a spinner is the wrong answer. The control sits on the
 * blue header panel, so it carries its own palette rather than the theme's.
 *
 * A refusal is announced through the title rather than a line of red text: at
 * this size the text would reflow the header, and the control itself snapping
 * back is the honest signal that nothing changed.
 */
export function AgentStatusControl({ agentId, status }: { agentId: string; status: AgentStatus }) {
  const [value, setValue] = useState<AgentStatus>(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div
      data-pending={pending ? '' : undefined}
      className="data-pending:opacity-60"
      title={error ?? undefined}
    >
      <Segmented
        label="Agent status"
        value={value}
        options={OPTIONS}
        className="border border-white/25 bg-white/10 ring-0"
        itemClassName="text-white/70 hover:text-white data-[state=on]:bg-white data-[state=on]:text-accent-700"
        onValueChange={(next) => {
          const previous = value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await setAgentStatusAction(agentId, next);
            if (result.status === 'error') {
              setValue(previous);
              setError(result.message);
            }
          });
        }}
      />
    </div>
  );
}
