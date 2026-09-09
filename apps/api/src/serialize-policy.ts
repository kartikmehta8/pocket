/**
 * Policy serialisation.
 *
 * A policy's money fields are stored in base units but always leave as decimal
 * strings, denominated in the policy's first allowed asset.
 */

import { money } from './serialize.js';

/** JSON shape of a policy, matching API_CONTRACT.md. */
export interface PolicyJson {
  allowedAssets: string[];
  allowedChains: string[];
  allowedCategories: string[];
  maxTransactionAmount: string;
  trustedRecipients: string[];
  unknownRecipientBehaviour: string;
  approvalThreshold: string | null;
  maxUsdPerTransaction: string | null;
}

/**
 * Serialises a stored policy.
 *
 * @param row - Policy as persisted, with money in base units.
 * @returns The wire representation, with money as decimal strings denominated
 *   in the policy's first allowed asset.
 */
export function policyToJson(row: {
  allowedAssets: string[];
  allowedChains: string[];
  allowedCategories: string[];
  maxTransactionAmount: bigint;
  trustedRecipients: string[];
  unknownRecipientBehaviour: string;
  approvalThreshold: bigint | null;
  maxUsdCents: bigint | null;
}): PolicyJson {
  const asset = row.allowedAssets[0] ?? 'USDC';
  return {
    allowedAssets: row.allowedAssets,
    allowedChains: row.allowedChains,
    allowedCategories: row.allowedCategories,
    maxTransactionAmount: money(row.maxTransactionAmount, asset),
    trustedRecipients: row.trustedRecipients,
    unknownRecipientBehaviour: row.unknownRecipientBehaviour,
    approvalThreshold: row.approvalThreshold === null ? null : money(row.approvalThreshold, asset),
    // Cents to dollars, never through a float.
    maxUsdPerTransaction:
      row.maxUsdCents === null
        ? null
        : `${row.maxUsdCents / 100n}.${(row.maxUsdCents % 100n).toString().padStart(2, '0')}`,
  };
}
