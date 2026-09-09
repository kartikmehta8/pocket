/**
 * Account shapes: the tenant, the people in it, the credentials it issues, and
 * what comes back from buying something.
 *
 * Re-exported from `@/lib/types`, which stays the single import site.
 */

import type { Decision, Payment } from './types';

/** The signed-in tenant, from `GET /v1/orgs/me`. */
export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  members: number;
}

/** How the current caller authenticated. */
export type Principal = 'api-key' | 'session';

/** An API key as an operator sees it. Never carries the secret. */
export interface ApiKey {
  id: string;
  label: string;
  /** First 16 characters of the plaintext, enough to recognise a key. */
  prefix: string;
  createdAt: string;
  revokedAt: string | null;
}

/** The signed-in person, from the session exchange. */
export interface SessionUser {
  id: string;
  email: string | null;
  createdAt: string;
}

/** What a purchase attempt did. Every outcome is a normal result. */
export type PurchaseOutcome =
  | { status: 'free'; result: unknown }
  | {
      status: 'paid';
      result: unknown;
      payment: Payment;
      settlement: Record<string, unknown> | null;
    }
  | { status: 'blocked'; payment: Payment; decision: Decision; requirement: X402Requirement }
  /** A retry of an attempt that had already paid. Nothing refused it. */
  | { status: 'replayed'; payment: Payment }
  | { status: 'failed'; message: string; code: string; payment?: Payment };

/** One acceptable payment, as a seller advertised it in a 402. */
export interface X402Requirement {
  scheme: string;
  network: string;
  /** Price in the asset's base units. */
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
}
