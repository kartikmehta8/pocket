'use client';

import { useState, useTransition } from 'react';

import { ActionFeedback } from '@/components/ui/action-feedback';
import { Segmented } from '@/components/ui/segmented';
import { IDLE_ACTION, type ActionState } from '@/lib/action-state';
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
export function AgentStatusControl({ agentId, status }: { agentId: string; status: AgentStatus }) {
  const [value, setValue] = useState<AgentStatus>(status);
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <div data-pending={pending ? '' : undefined} className="data-pending:opacity-60">
        <Segmented
          label="Agent status"
          value={value}
          options={OPTIONS}
          onValueChange={(next) => {
            const previous = value;
            setValue(next);
            startTransition(async () => {
              const result = await setAgentStatusAction(agentId, next);
              if (result.status === 'error') setValue(previous);
              setState(result);
            });
          }}
        />
      </div>
      <ActionFeedback state={state} />
    </div>
  );
}
