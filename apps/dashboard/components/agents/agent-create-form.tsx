'use client';

import { Bot } from 'lucide-react';
import { useActionState, useId } from 'react';

import { createAgentAction } from '@/lib/actions-account';
import { IDLE_ACTION } from '@/lib/action-state';
import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button, SUBMIT_WIDTH } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

/**
 * Registers an agent and provisions its wallet.
 *
 * Creation deliberately grants nothing: the new agent has no budget and no
 * policy, so it cannot spend until an operator says what it may spend on.
 */
export function AgentCreateForm() {
  const [state, submit, pending] = useActionState(createAgentAction, IDLE_ACTION);
  const nameId = useId();
  const descriptionId = useId();

  return (
    <form action={submit} className="flex flex-col gap-3">
      {/* Two fields with hints of different heights cannot share a row with a
          button and stay aligned: bottom-aligning puts the button level with
          the hints, and centre-aligning puts it level with nothing. The button
          gets its own row instead. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          htmlFor={nameId}
          label="Agent name"
          hint="How it appears in payments and the audit trail."
        >
          <Input id={nameId} name="name" placeholder="Hermes" maxLength={120} required />
        </Field>
        <Field htmlFor={descriptionId} label="What it does" hint="Optional.">
          <Input
            id={descriptionId}
            name="description"
            placeholder="Research agent that buys paid market data"
            maxLength={500}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          icon={Bot}
          loading={pending}
          className={SUBMIT_WIDTH}
        >
          {pending ? 'Provisioning' : 'Create agent'}
        </Button>
        <ActionFeedback state={state} className="min-h-0" />
      </div>
    </form>
  );
}
