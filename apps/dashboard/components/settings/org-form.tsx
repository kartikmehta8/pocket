'use client';

import { Save } from 'lucide-react';
import { useActionState, useId } from 'react';

import { renameOrgAction } from '@/lib/actions-account';
import { IDLE_ACTION } from '@/lib/action-state';
import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button, SUBMIT_WIDTH } from '@/components/ui/button';
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
    <form action={submit} className="flex flex-col gap-2">
      <Field
        htmlFor={nameId}
        label="Organization name"
        hint="Shown in the account menu and on every audit entry."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={nameId}
            name="name"
            defaultValue={name}
            maxLength={120}
            disabled={disabled}
            className="w-full max-w-xs min-w-[11rem] flex-1"
            required
          />
          <Button
            type="submit"
            variant="primary"
            icon={Save}
            loading={pending}
            disabled={disabled}
            className={SUBMIT_WIDTH}
          >
            {pending ? 'Saving' : 'Save'}
          </Button>
        </div>
      </Field>
      <ActionFeedback state={state} />
    </form>
  );
}
