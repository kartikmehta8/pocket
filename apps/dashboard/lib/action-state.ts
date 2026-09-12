/**
 * The shape every mutation server action answers with, so a form can report
 * success or failure inline without throwing.
 */

import type { PurchaseOutcome } from './types';

/** Result of a mutation server action, surfaced inline beside its form. */
export interface ActionState {
  status: 'idle' | 'success' | 'error';
  /** Human-readable outcome; empty while idle. */
  message: string;
}

/** Starting state for every mutation form. */
export const IDLE_ACTION: ActionState = { status: 'idle', message: '' };

/** Result of minting a key: the plaintext travels back exactly once. */
export interface SecretState extends ActionState {
  /** The new key, shown once and never fetchable again. Empty until minted. */
  secret: string;
  /** Monotonic counter, so minting twice still re-animates the reveal. */
  revision: number;
}

/** Starting state for the key-minting form. */
export const IDLE_SECRET: SecretState = { status: 'idle', message: '', secret: '', revision: 0 };

/** Inline state for the buy control, carrying whatever the purchase returned. */
export interface PurchaseState extends ActionState {
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
