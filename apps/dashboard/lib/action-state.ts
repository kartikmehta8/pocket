import type { Decision } from './types';

/** Result of a mutation server action, surfaced inline beside its form. */
export interface ActionState {
  status: 'idle' | 'success' | 'error';
  /** Human-readable outcome; empty while idle. */
  message: string;
}

/** Starting state for every mutation form. */
export const IDLE_ACTION: ActionState = { status: 'idle', message: '' };

/** Result of the payment preview action, carrying the policy decision. */
export interface PreviewState extends ActionState {
  decision: Decision | null;
  /** Monotonic counter so a repeated identical decision still re-animates. */
  revision: number;
}

/** Starting state for the payment preview form. */
export const IDLE_PREVIEW: PreviewState = {
  status: 'idle',
  message: '',
  decision: null,
  revision: 0,
};
