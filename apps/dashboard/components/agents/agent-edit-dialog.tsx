'use client';

/**
 * The modal that renames an agent, opened from its own page.
 */

import { Save } from 'lucide-react';
import { useId, useState, useTransition } from 'react';

import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { IDLE_ACTION, type ActionState } from '@/lib/action-state';
import { editAgentAction } from '@/lib/actions';
import type { AgentSummary } from '@/lib/types';

/** Props for {@link AgentEditDialog}. */
export interface AgentEditDialogProps {
  agent: AgentSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Renaming an agent, and saying what it is for.
 *
 * @remarks A name chosen in the first thirty seconds of using a product is the
 * one thing most likely to be wrong, and it is the name every payment and
 * every audit entry carries from then on. Renaming updates all of them,
 * because there is one agent and it now has this name.
 *
 * A dialog rather than fields edited in place: the header those values live on
 * is a coloured panel, and an input on it would either fight the palette or
 * stop looking like an input.
 */
export function AgentEditDialog({ agent, open, onOpenChange }: AgentEditDialogProps) {
  const nameId = useId();
  const descriptionId = useId();
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description ?? '');
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  const [pending, startTransition] = useTransition();

  /** Puts the form back to what is saved, so cancelling really cancels. */
  const reset = () => {
    setName(agent.name);
    setDescription(agent.description ?? '');
    setState(IDLE_ACTION);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) onOpenChange(true);
        else close();
      }}
      title="Edit agent"
      description="The name travels with every payment and audit entry this agent has."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await editAgentAction(agent.id, { name, description });
            setState(result);
            if (result.status === 'success') onOpenChange(false);
          });
        }}
      >
        <Field htmlFor={nameId} label="Name">
          <Input
            id={nameId}
            value={name}
            maxLength={120}
            required
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field
          htmlFor={descriptionId}
          label="Description"
          hint="What this agent is for. Shown on its page and in the agent list."
        >
          <Input
            id={descriptionId}
            value={description}
            maxLength={500}
            autoComplete="off"
            placeholder="Research agent that buys paid market data."
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <ActionFeedback state={state} />

        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" icon={Save} loading={pending}>
            {pending ? 'Saving' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
