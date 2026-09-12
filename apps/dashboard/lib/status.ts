/**
 * How a status reads on screen: its tone, its label and its glyph.
 */

import {
  Ban,
  CircleCheck,
  CircleDot,
  CirclePause,
  CircleSlash,
  Clock,
  Send,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import type { AgentStatus, PaymentStatus } from './types';

/** Semantic colour role a badge or meter can wear. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** A status rendered as colour plus an icon and a label — never colour alone. */
export interface StatusPresentation {
  tone: Tone;
  label: string;
  Icon: LucideIcon;
  /**
   * What the state means, shown on hover.
   *
   * @remarks Every one of these words appears somewhere else on the page too.
   * A tooltip explains a label; it never carries the only copy of a fact.
   */
  hint: string;
}

/**
 * Presentation for a payment lifecycle state.
 *
 * @param status Payment status from the API.
 */
export function paymentStatusPresentation(status: PaymentStatus): StatusPresentation {
  switch (status) {
    case 'blocked':
      return {
        tone: 'danger',
        label: 'Blocked',
        Icon: Ban,
        hint: 'Policy refused it. Nothing was signed and no money moved. The denial code says which rule stopped it.',
      };
    case 'awaiting_approval':
      return {
        tone: 'warning',
        label: 'Awaiting approval',
        Icon: Clock,
        hint: 'Above the approval threshold. Held unsigned until a person approves or rejects it.',
      };
    case 'approved':
      return {
        tone: 'info',
        label: 'Approved',
        Icon: ShieldCheck,
        hint: 'Cleared to spend. The transaction has not been broadcast yet.',
      };
    case 'submitted':
      return {
        tone: 'info',
        label: 'Submitted',
        Icon: Send,
        hint: 'Broadcast to the chain, waiting for a receipt. Budget is already reserved against it.',
      };
    case 'settled':
      return {
        tone: 'success',
        label: 'Settled',
        Icon: CircleCheck,
        hint: 'Confirmed on chain. The transaction hash links to the explorer.',
      };
    case 'failed':
      return {
        tone: 'danger',
        label: 'Failed',
        Icon: TriangleAlert,
        hint: 'Authorised but did not settle. The reserved budget has been released.',
      };
  }
}

/**
 * Presentation for an agent's operational state.
 *
 * @param status Agent status from the API.
 */
export function agentStatusPresentation(status: AgentStatus): StatusPresentation {
  switch (status) {
    case 'active':
      return {
        tone: 'success',
        label: 'Active',
        Icon: CircleDot,
        hint: 'May spend, within its budget and policy.',
      };
    case 'paused':
      return {
        tone: 'warning',
        label: 'Paused',
        Icon: CirclePause,
        hint: 'Temporarily stopped. Every payment is denied until it is resumed.',
      };
    case 'revoked':
      return {
        tone: 'danger',
        label: 'Revoked',
        Icon: CircleSlash,
        hint: 'Permanently stopped. Its history is kept; it can never spend again.',
      };
  }
}

/**
 * Map an anomaly severity string to a tone.
 *
 * @param severity Free-form severity from the analytics adapter.
 */
export function severityTone(severity: string): Tone {
  const value = severity.toLowerCase();
  if (value === 'high' || value === 'critical') return 'danger';
  if (value === 'medium') return 'warning';
  return 'info';
}

/**
 * Tone for a usage meter, escalating as the limit is approached.
 *
 * @param ratio Consumed fraction in `0..1`.
 */
export function usageTone(ratio: number): Tone {
  if (ratio >= 0.9) return 'danger';
  if (ratio >= 0.7) return 'warning';
  return 'info';
}

/** Audit actors, and how a decision reads on screen. */
export * from './status-decision';
