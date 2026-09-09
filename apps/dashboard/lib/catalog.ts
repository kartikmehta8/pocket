import { humanize } from './format';
import type { Category, PaymentStatus, UnknownRecipientBehaviour } from './types';

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
