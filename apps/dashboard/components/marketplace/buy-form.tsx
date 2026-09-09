'use client';

import { ShoppingCart } from 'lucide-react';
import { useActionState, useId } from 'react';

import { purchaseAction } from '@/lib/actions-purchase';
import { IDLE_PURCHASE } from '@/lib/action-state';
import type { AgentSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Field, Input, NativeSelect } from '@/components/ui/field';
import { Hint } from '@/components/ui/tooltip';
import { ActionFeedback } from '@/components/ui/action-feedback';
import { PurchaseResult } from './purchase-result';

/** Props for {@link BuyForm}. */
export interface BuyFormProps {
  /** Agents that could pay. An agent with no budget will simply be refused. */
  agents: AgentSummary[];
  /** The resource being bought. */
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
}

/**
 * Buys one resource on a chosen agent's behalf.
 *
 * A person clicking this and an agent calling the MCP tool run through the
 * same endpoint and the same policy engine. The only difference recorded is
 * who initiated it.
 */
export function BuyForm({
  agents,
  url,
  reason,
  category,
  label = 'Buy',
  editableUrl = false,
}: BuyFormProps) {
  const [state, submit, pending] = useActionState(purchaseAction, IDLE_PURCHASE);
  const agentId = useId();
  const urlId = useId();

  if (agents.length === 0) {
    return (
      <p className="text-text-muted text-xs leading-relaxed">
        Register an agent before buying. The payment is made from its wallet, under its policy.
      </p>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
      {editableUrl ? null : <input type="hidden" name="url" value={url} />}
      <input type="hidden" name="reason" value={reason} />
      <input type="hidden" name="category" value={category} />

      {editableUrl ? (
        <Field
          htmlFor={urlId}
          label="Resource URL"
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
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <Field htmlFor={agentId} label="Pay from" className="min-w-[11rem] flex-1">
          <NativeSelect id={agentId} name="agentId" defaultValue={agents[0]?.id}>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
                {agent.budget === null ? ' (no budget)' : ` (${agent.spend.dailyRemaining} left)`}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Hint label="Runs the full x402 exchange: fetch, policy decision, signature, settlement. Nothing is signed unless policy allows it.">
          <span>
            <Button type="submit" variant="primary" disabled={pending}>
              <ShoppingCart aria-hidden className="size-3.5" strokeWidth={2} />
              {pending ? 'Paying…' : label}
            </Button>
          </span>
        </Hint>
      </div>

      <ActionFeedback state={state} />
      <PurchaseResult outcome={state.outcome} revision={state.revision} />
    </form>
  );
}
