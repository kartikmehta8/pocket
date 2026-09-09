'use server';

import { revalidatePath } from 'next/cache';

import { createAgent, createApiKey, renameOrg, revokeApiKey } from './api';
import type { ActionState, SecretState } from './action-state';

/**
 * Rename the organization.
 *
 * @param _previous Prior form state, ignored.
 * @param form Carries `name`.
 */
export async function renameOrgAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const name = String(form.get('name') ?? '').trim();
  if (name === '') return { status: 'error', message: 'Enter a name.' };

  const result = await renameOrg(name);
  if (!result.ok) return { status: 'error', message: `${result.code}: ${result.message}` };

  revalidatePath('/', 'layout');
  return { status: 'success', message: `Renamed to ${result.data.org.name}.` };
}

/**
 * Mint an API key.
 *
 * @param previous Prior form state, read only for its revision counter.
 * @param form Carries `label`.
 * @returns The plaintext key. It is not persisted anywhere else, so a caller
 *   that discards this value has lost it.
 */
export async function createApiKeyAction(
  previous: SecretState,
  form: FormData,
): Promise<SecretState> {
  const label = String(form.get('label') ?? '').trim();
  if (label === '') {
    return { ...previous, status: 'error', message: 'Name the key so you can revoke it later.' };
  }

  const result = await createApiKey(label);
  if (!result.ok) {
    return { ...previous, status: 'error', message: `${result.code}: ${result.message}` };
  }

  revalidatePath('/settings');
  revalidatePath('/setup');
  return {
    status: 'success',
    message: 'Copy it now. This is the only time it is shown.',
    secret: result.data.apiKey,
    revision: previous.revision + 1,
  };
}

/**
 * Revoke an API key.
 *
 * @param id Key identifier.
 * @returns Inline outcome. The API refuses to revoke the last live key.
 */
export async function revokeApiKeyAction(id: string): Promise<ActionState> {
  const result = await revokeApiKey(id);
  if (!result.ok) return { status: 'error', message: `${result.code}: ${result.message}` };

  revalidatePath('/settings');
  return { status: 'success', message: `Revoked ${result.data.key.label}.` };
}

/**
 * Register an agent and provision its wallet.
 *
 * @param _previous Prior form state, ignored.
 * @param form Carries `name` and optional `description`.
 */
export async function createAgentAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const name = String(form.get('name') ?? '').trim();
  if (name === '') return { status: 'error', message: 'Give the agent a name.' };
  const description = String(form.get('description') ?? '').trim();

  const result = await createAgent({ name, ...(description === '' ? {} : { description }) });
  if (!result.ok) return { status: 'error', message: `${result.code}: ${result.message}` };

  revalidatePath('/agents');
  revalidatePath('/dashboard');
  return {
    status: 'success',
    message: `${result.data.agent.name} is ready at ${result.data.wallet.address}. Set a budget and policy before it can spend.`,
  };
}
