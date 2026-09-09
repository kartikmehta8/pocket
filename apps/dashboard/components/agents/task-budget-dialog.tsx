'use client';

import { useState, useTransition } from 'react';

import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { IDLE_ACTION, type ActionState } from '@/lib/action-state';
import { createTaskBudgetAction } from '@/lib/actions';

/** Props for {@link TaskBudgetDialog}. */
export interface TaskBudgetDialogProps {
  agentId: string;
  /** Asset the agent's budget is denominated in, used as the default. */
  defaultAsset: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal for opening a task-scoped budget. Radix supplies the focus trap and
 * escape handling; the panel fades and rises on the shared curve.
 */
export function TaskBudgetDialog({
  agentId,
  defaultAsset,
  open,
  onOpenChange,
}: TaskBudgetDialogProps) {
  const [label, setLabel] = useState('');
  const [asset, setAsset] = useState(defaultAsset);
  const [limit, setLimit] = useState('');
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New task budget"
      description="A ring-fenced allowance the agent can spend against for one task."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await createTaskBudgetAction(agentId, { label, asset, limit });
            setState(result);
            if (result.status === 'success') {
              setLabel('');
              setLimit('');
              onOpenChange(false);
            }
          });
        }}
      >
        <Field htmlFor="task-label" label="Label">
          <Input
            id="task-label"
            required
            value={label}
            placeholder="ETH ecosystem research"
            onChange={(event) => setLabel(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="task-asset" label="Asset">
            <Input
              id="task-asset"
              required
              value={asset}
              onChange={(event) => setAsset(event.target.value)}
            />
          </Field>
          <Field htmlFor="task-limit" label="Limit">
            <Input
              id="task-limit"
              required
              inputMode="decimal"
              className="figures"
              value={limit}
              placeholder="5.00"
              onChange={(event) => setLimit(event.target.value)}
            />
          </Field>
        </div>
        <ActionFeedback state={state} />
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? 'Opening…' : 'Open budget'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
