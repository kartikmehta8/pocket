'use client';

/**
 * The approve and reject controls on a held payment.
 */

import { useState, useTransition } from 'react';

import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { IDLE_ACTION, type ActionState } from '@/lib/action-state';
import { approvePaymentAction, rejectPaymentAction } from '@/lib/actions';

/**
 * Approve or reject a payment that is awaiting human sign-off, with an
 * optional note recorded in the audit trail.
 */
export function PaymentApproval({ paymentId }: { paymentId: string }) {
  const [note, setNote] = useState('');
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  const [pending, startTransition] = useTransition();

  const run = (action: typeof approvePaymentAction) =>
    startTransition(async () => {
      setState(await action(paymentId, note.trim() === '' ? undefined : note.trim()));
    });

  return (
    <div className="flex flex-col gap-2">
      <label className="eyebrow" htmlFor={`note-${paymentId}`}>
        Reviewer note
      </label>
      <Input
        id={`note-${paymentId}`}
        value={note}
        placeholder="Optional, recorded in the audit trail"
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() => run(approvePaymentAction)}
        >
          Approve
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => run(rejectPaymentAction)}
        >
          Reject
        </Button>
      </div>
      <ActionFeedback state={state} />
    </div>
  );
}
