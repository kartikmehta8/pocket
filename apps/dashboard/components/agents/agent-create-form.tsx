'use client';

import { Bot } from 'lucide-react';
import { useActionState, useId } from 'react';

import { createAgentAction } from '@/lib/actions-account';
import { IDLE_ACTION } from '@/lib/action-state';
import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';
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
      <div className="flex flex-wrap items-end gap-2">
        <Field
          htmlFor={nameId}
          label="Agent name"
          className="min-w-[12rem] flex-1"
          hint="How it appears in payments and the audit trail."
        >
          <Input id={nameId} name="name" placeholder="Hermes" maxLength={120} required />
        </Field>
        <Field
          htmlFor={descriptionId}
          label="What it does"
          className="min-w-[14rem] flex-1"
          hint="Optional."
        >
          <Input
            id={descriptionId}
            name="description"
            placeholder="Research agent that buys paid market data"
            maxLength={500}
          />
        </Field>
        <Button type="submit" disabled={pending} className="mb-6">
          <Bot aria-hidden className="size-3.5" strokeWidth={2} />
          {pending ? 'Provisioning…' : 'Create agent'}
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
