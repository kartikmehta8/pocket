import { humanize } from './format';
import type { AuditEvent, Category, PaymentStatus, UnknownRecipientBehaviour } from './types';

/** Every spend category in the contract, in contract order. */
export const CATEGORIES: readonly Category[] = [
  'research',
  'inference',
  'data',
  'compute',
  'storage',
  'api',
  'agent-service',
  'other',
];

/** Every payment status in the contract, in lifecycle order. */
export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'blocked',
  'awaiting_approval',
  'approved',
  'submitted',
  'settled',
  'failed',
];

/**
 * The action families the audit trail can be narrowed to.
 *
 * @remarks Each value is the prefix before the dot in an action name, so
 * `payment` covers `payment.settled`, `payment.rejected` and the rest. Mirrors
 * the actions the API records; a new family belongs here too.
 */
export const AUDIT_ACTIVITIES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'payment', label: 'Payments' },
  { value: 'agent', label: 'Agents' },
  { value: 'budget', label: 'Budgets' },
  { value: 'task_budget', label: 'Task budgets' },
  { value: 'policy', label: 'Policies' },
  { value: 'api_key', label: 'API keys' },
  { value: 'wallet', label: 'Wallets' },
  { value: 'org', label: 'Organization' },
];

/** Who can act, in the order the filter offers them. */
export const AUDIT_ACTORS: ReadonlyArray<AuditEvent['actorType']> = ['agent', 'human', 'system'];

/** Choices for what happens when a recipient is not on the trusted list. */
export const UNKNOWN_RECIPIENT_OPTIONS: ReadonlyArray<{
  value: UnknownRecipientBehaviour;
  label: string;
}> = [
  { value: 'block', label: 'Block' },
  { value: 'require_approval', label: 'Ask a human' },
  { value: 'allow', label: 'Allow' },
];

/** Display labels for categories whose sentence case would read wrong. */
const CATEGORY_OVERRIDES: Partial<Record<Category, string>> = {
  api: 'API',
  'agent-service': 'Agent service',
};

/**
 * Human label for a spend category.
 *
 * @param category Contract category value.
 * @returns A display label, e.g. `"API"` rather than `"Api"`.
 */
export function categoryLabel(category: Category): string {
  return CATEGORY_OVERRIDES[category] ?? humanize(category);
}
