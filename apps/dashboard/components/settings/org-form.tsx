'use client';

import { useActionState, useId } from 'react';

import { renameOrgAction } from '@/lib/actions-account';
import { IDLE_ACTION } from '@/lib/action-state';
import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

/**
 * Renames the organization.
 *
 * @param name Current name, used as the field's starting value.
 * @param disabled Whether the caller is a machine, which the API refuses.
 */
export function OrgForm({ name, disabled }: { name: string; disabled: boolean }) {
  const [state, submit, pending] = useActionState(renameOrgAction, IDLE_ACTION);
  const nameId = useId();

  return (
    <form action={submit} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field
          htmlFor={nameId}
          label="Organization name"
          hint="Shown in the top bar and on every audit entry."
          className="min-w-[14rem] flex-1"
        >
          <Input
            id={nameId}
            name="name"
            defaultValue={name}
            maxLength={120}
            disabled={disabled}
            required
          />
        </Field>
        <Button type="submit" disabled={pending || disabled} className="mb-6">
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
