'use client';

import { ShoppingCart } from 'lucide-react';
import { useActionState, useId, useState } from 'react';

import { purchaseAction } from '@/lib/actions-purchase';
import { IDLE_PURCHASE } from '@/lib/action-state';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { Hint } from '@/components/ui/tooltip';
import { ActionFeedback } from '@/components/ui/action-feedback';
import { PurchaseResult } from './purchase-result';

/** Props for {@link BuyForm}. */
export interface BuyFormProps {
  /** The agent paying, chosen once for the whole page. */
  agentId: string;
  /** The resource being bought. Ignored when the buyer types one. */
  url: string;
  /** What to record as the reason. */
  reason: string;
  /** Spend category recorded on the payment. */
  category: string;
  /** Button text. */
  label?: string;
  /**
   * Whether the buyer types the URL rather than it being fixed.
   *
   * @remarks Used by the free-form panel, where the resource is not one of the
   * seller's advertised feeds.
   */
  editableUrl?: boolean;
  /**
   * Why this purchase cannot go through, when that is known before trying.
   *
   * @remarks Presented as a disabled control with the reason beside it, not a
   * hidden one: a button that vanishes leaves the reader wondering whether
   * they misread the page.
   */
  blockedReason?: string;
}

/**
 * Buys one resource on the chosen agent's behalf.
 *
 * A person clicking this and an agent calling the MCP tool run through the
 * same endpoint and the same policy engine. The only difference recorded is
 * who initiated it.
 *
 * @remarks The agent is not chosen here. Six cards each asking "pay from?"
 * was six chances to answer differently on one page; the choice is made once,
 * above the grid, and arrives as a prop.
 */
export function BuyForm({
  agentId,
  url,
  reason,
  category,
  label = 'Buy',
  editableUrl = false,
  blockedReason,
}: BuyFormProps) {
  const [state, submit, pending] = useActionState(purchaseAction, IDLE_PURCHASE);
  // The revision whose result has been closed. A fresh purchase bumps the
  // revision, so the next result opens on its own.
  const [dismissed, setDismissed] = useState(0);
  const urlId = useId();
  const open = state.outcome !== null && state.revision !== dismissed;

  const button = (
    <Hint
      label={
        blockedReason ??
        'Runs the full x402 exchange: fetch, policy decision, signature, settlement. Nothing is signed unless policy allows it.'
      }
    >
      <span className={editableUrl ? '' : 'flex'}>
        <Button
          type="submit"
          variant="primary"
          icon={ShoppingCart}
          loading={pending}
          disabled={blockedReason !== undefined}
          className={editableUrl ? '' : 'w-full'}
        >
          {pending ? 'Paying' : label}
        </Button>
      </span>
    </Hint>
  );

  return (
    <form action={submit} className="flex flex-col gap-3">
      <input type="hidden" name="agentId" value={agentId} />
      <input type="hidden" name="reason" value={reason} />
      <input type="hidden" name="category" value={category} />

      {editableUrl ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field
            htmlFor={urlId}
            label="Resource URL"
            className="min-w-0 flex-1"
            hint="The seller states its price in the 402 response. Pocket evaluates that price before signing anything."
          >
            <Input
              id={urlId}
              name="url"
              type="url"
              placeholder="https://seller.example.com/v1/data"
              required
            />
          </Field>
          {/* Lifted by the hint's height, so the control lines up with the input. */}
          <div className="sm:pb-6">{button}</div>
        </div>
      ) : (
        <>
          <input type="hidden" name="url" value={url} />
          {button}
        </>
      )}

      {blockedReason === undefined ? null : (
        <p className="text-warning-ink bg-warning-soft border-border rounded-md border px-2.5 py-2 text-xs leading-relaxed">
          {blockedReason}
        </p>
      )}

      <ActionFeedback state={state} />

      {/* In a dialog rather than under the button: a response is a screen of
          JSON, and inline it stretched one card and its whole row. */}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setDismissed(state.revision);
        }}
        title="Purchase"
        description={reason}
        wide
      >
        <PurchaseResult outcome={state.outcome} revision={state.revision} />
      </Dialog>
    </form>
  );
}
