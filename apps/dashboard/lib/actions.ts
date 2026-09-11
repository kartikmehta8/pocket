'use server';

import { revalidatePath } from 'next/cache';

import {
  approvePayment,
  closeTaskBudget,
  createTaskBudget,
  deleteAgent,
  patchAgent,
  putBudget,
  putPolicy,
  rejectPayment,
  transferAgentFunds,
} from './api';
import type { ActionState } from './action-state';
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
 * Move an agent's whole balance to another agent.
 *
 * @param agentId The agent being emptied.
 * @param toAgentId The agent receiving the funds.
 * @returns What moved, or why nothing did.
 * @remarks A treasury movement between two wallets the organization already
 * custodies. No policy governs it and no budget is drawn down, so it lands in
 * the audit trail rather than the payment ledger.
 */
export async function transferAgentFundsAction(
  agentId: string,
  toAgentId: string,
): Promise<ActionState> {
  const result = await transferAgentFunds(agentId, { toAgentId });
  if (!result.ok) return toState(result, '');
  revalidateAll(agentId);
  revalidatePath(`/agents/${toAgentId}`);
  const { amount, asset } = result.data.transfer;
  return { status: 'success', message: `Moved ${amount} ${asset}.` };
}

/**
 * Retire an agent.
 *
 * @param agentId The agent to delete.
 * @returns Success, or the reason it was refused.
 * @remarks The API refuses while the wallet still holds funds, which is why
 * the dialog offers to move them first. Payments the agent made stay in the
 * ledger; only the agent stops being offered anywhere.
 */
export async function deleteAgentAction(agentId: string): Promise<ActionState> {
  const result = await deleteAgent(agentId);
  if (result.ok) revalidateAll(agentId);
  return toState(result, 'Agent deleted.');
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
