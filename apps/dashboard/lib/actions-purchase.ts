'use server';

import { revalidatePath } from 'next/cache';

import { purchaseResource } from './api';
import type { PurchaseOutcome } from './types';

/** Inline state for the buy control, carrying whatever the purchase returned. */
export interface PurchaseState {
  status: 'idle' | 'success' | 'error';
  message: string;
  outcome: PurchaseOutcome | null;
  /** Monotonic counter, so buying the same thing twice still re-animates. */
  revision: number;
}

/** Starting state for the buy control. */
export const IDLE_PURCHASE: PurchaseState = {
  status: 'idle',
  message: '',
  outcome: null,
  revision: 0,
};

/** One line describing what happened, for the inline announcement. */
function summarise(outcome: PurchaseOutcome): { status: 'success' | 'error'; message: string } {
  switch (outcome.status) {
    case 'paid':
      return {
        status: 'success',
        message: `Paid ${outcome.payment.amount} ${outcome.payment.asset} and received the data.`,
      };
    case 'free':
      return { status: 'success', message: 'The seller served this without charging.' };
    case 'blocked':
      return {
        status: 'error',
        message: outcome.payment.denialCode
          ? `Refused: ${outcome.payment.denialCode}.`
          : 'Held for human approval before anything was signed.',
      };
    case 'failed':
      return { status: 'error', message: outcome.message };
  }
}

/**
 * Buys a resource on an agent's behalf.
 *
 * @param previous Prior state, read only for its revision counter.
 * @param form Carries `agentId`, `url`, `reason` and `category`.
 * @returns What happened. A policy refusal is a normal result, not an error:
 *   the agent's budget was never touched and nothing was signed.
 * @remarks The whole x402 exchange runs inside the API. This action does not
 *   hold a signed payload and cannot contact the seller directly, so a purchase
 *   from the dashboard passes through exactly the policy code an agent's does.
 */
export async function purchaseAction(
  previous: PurchaseState,
  form: FormData,
): Promise<PurchaseState> {
  const agentId = String(form.get('agentId') ?? '').trim();
  const url = String(form.get('url') ?? '').trim();
  const reason = String(form.get('reason') ?? '').trim();
  const taskBudgetId = String(form.get('taskBudgetId') ?? '').trim();

  if (agentId === '') return { ...previous, status: 'error', message: 'Choose an agent.' };
  if (url === '') return { ...previous, status: 'error', message: 'Enter a resource URL.' };

  const result = await purchaseResource({
    agentId,
    url,
    reason: reason === '' ? 'Purchased from the Pocket dashboard' : reason,
    category: String(form.get('category') ?? 'data'),
    ...(taskBudgetId === '' ? {} : { taskBudgetId }),
  });

  if (!result.ok) {
    return {
      ...previous,
      status: 'error',
      message: `${result.code}: ${result.message}`,
      revision: previous.revision + 1,
    };
  }

  revalidatePath('/dashboard');
  revalidatePath('/payments');
  revalidatePath('/audit');
  revalidatePath(`/agents/${agentId}`);

  const { status, message } = summarise(result.data);
  return { status, message, outcome: result.data, revision: previous.revision + 1 };
}
