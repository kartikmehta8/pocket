'use server';

import { revalidatePath } from 'next/cache';

import {
  approvePayment,
  closeTaskBudget,
  createTaskBudget,
  patchAgent,
  previewPayment,
  putBudget,
  putPolicy,
  rejectPayment,
} from './api';
import type { ActionState, PreviewState } from './action-state';
import type { ApiResult } from './http';
import type { AgentStatus, Policy } from './types';

/** Refresh every view that can show agent or payment state. */
function revalidateAll(agentId?: string): void {
  revalidatePath('/dashboard');
  revalidatePath('/agents');
  revalidatePath('/payments');
  revalidatePath('/audit');
  if (agentId) revalidatePath(`/agents/${agentId}`);
}

/** Turn an API result into an inline form state. */
function toState<T>(result: ApiResult<T>, success: string): ActionState {
  return result.ok
    ? { status: 'success', message: success }
    : { status: 'error', message: `${result.code}: ${result.message}` };
}

/**
 * Change an agent's operational status.
 *
 * @param agentId Agent to update.
 * @param status New status.
 */
export async function setAgentStatusAction(
  agentId: string,
  status: AgentStatus,
): Promise<ActionState> {
  const result = await patchAgent(agentId, { status });
  if (result.ok) revalidateAll(agentId);
  return toState(result, `Agent is now ${status}.`);
}

/**
 * Replace an agent's daily and per-transaction limits.
 *
 * @param agentId Agent to update.
 * @param budget Asset plus both limits, as decimal strings.
 */
export async function setBudgetAction(
  agentId: string,
  budget: { asset: string; dailyLimit: string; perTransactionLimit: string },
): Promise<ActionState> {
  const result = await putBudget(agentId, budget);
  if (result.ok) revalidateAll(agentId);
  return toState(result, 'Budget saved.');
}

/**
 * Replace an agent's whole policy document.
 *
 * @param agentId Agent to update.
 * @param policy The complete policy, as the contract defines it.
 */
export async function setPolicyAction(agentId: string, policy: Policy): Promise<ActionState> {
  const result = await putPolicy(agentId, policy);
  if (result.ok) revalidateAll(agentId);
  return toState(result, 'Policy saved.');
}

/**
 * Open a new task-scoped budget for an agent.
 *
 * @param agentId Agent that will spend against it.
 * @param input Label, asset and decimal limit.
 */
export async function createTaskBudgetAction(
  agentId: string,
  input: { label: string; asset: string; limit: string },
): Promise<ActionState> {
  const result = await createTaskBudget(agentId, input);
  if (result.ok) revalidateAll(agentId);
  return toState(result, `Task budget "${input.label}" opened.`);
}

/**
 * Close a task budget so nothing further can be spent against it.
 *
 * @param agentId Owning agent, used to revalidate its detail page.
 * @param taskBudgetId Task budget to close.
 */
export async function closeTaskBudgetAction(
  agentId: string,
  taskBudgetId: string,
): Promise<ActionState> {
  const result = await closeTaskBudget(taskBudgetId);
  if (result.ok) revalidateAll(agentId);
  return toState(result, 'Task budget closed.');
}

/**
 * Approve a payment that is awaiting human sign-off.
 *
 * @param paymentId Payment to release.
 * @param note Optional reviewer note.
 */
export async function approvePaymentAction(paymentId: string, note?: string): Promise<ActionState> {
  const result = await approvePayment(paymentId, note);
  if (result.ok) revalidateAll(result.data.payment.agentId);
  return toState(result, 'Payment approved.');
}

/**
 * Reject a payment that is awaiting human sign-off.
 *
 * @param paymentId Payment to refuse.
 * @param note Optional reviewer note.
 */
export async function rejectPaymentAction(paymentId: string, note?: string): Promise<ActionState> {
  const result = await rejectPayment(paymentId, note);
  if (result.ok) revalidateAll(result.data.payment.agentId);
  return toState(result, 'Payment rejected.');
}

/**
 * Evaluate a proposed payment against an agent's policy without spending.
 *
 * @param previous Prior state, used to bump the reveal revision counter.
 * @param formData Fields from the preview form.
 */
export async function previewPaymentAction(
  previous: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const read = (key: string): string => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  };

  const result = await previewPayment({
    agentId: read('agentId'),
    amount: read('amount'),
    asset: read('asset'),
    chain: read('chain'),
    recipient: read('recipient'),
    category: read('category'),
    reason: read('reason'),
    initiatedBy: 'human',
  });

  const revision = previous.revision + 1;
  if (!result.ok) {
    return {
      status: 'error',
      message: `${result.code}: ${result.message}`,
      decision: null,
      revision,
    };
  }
  return { status: 'success', message: '', decision: result.data.decision, revision };
}
