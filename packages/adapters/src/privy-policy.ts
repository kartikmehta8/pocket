/**
 * The Privy-side wallet policy.
 *
 * This is defence in depth, not the primary control. Purse's own policy engine
 * decides every payment before anything is signed; this policy is a ceiling
 * the provider enforces even if Purse itself is wrong.
 *
 * Privy policies are **default-deny**: once a policy is attached to a wallet,
 * every RPC method that wallet uses must be explicitly allowed, and a `DENY`
 * on any rule beats an `ALLOW` on another. A policy that only denies would
 * brick the wallet entirely, including zero-value calls like token
 * association, so the shape here is allow-then-deny.
 */

import type { PrivyClient } from '@privy-io/server-auth';

/** How the wallet policy is parameterised. */
export interface WalletPolicyOptions {
  /** Per-transaction native value ceiling, in wei. */
  ceilingWei: bigint;
}

/**
 * Builds the policy rules.
 *
 * @param options - The ceiling to enforce.
 * @returns Rules in Privy's expected shape, with money as decimal wei strings.
 */
export function walletPolicyRules(options: WalletPolicyOptions) {
  return [
    {
      name: 'allow-wallet-operations',
      method: '*' as const,
      action: 'ALLOW' as const,
      conditions: [],
    },
    {
      name: 'deny-transfers-over-ceiling',
      method: 'eth_sendTransaction' as const,
      action: 'DENY' as const,
      conditions: [
        {
          fieldSource: 'ethereum_transaction' as const,
          field: 'value' as const,
          operator: 'gt' as const,
          // Decimal wei, which is the form Privy documents. Hex is rejected.
          value: options.ceilingWei.toString(),
        },
      ],
    },
    {
      name: 'deny-key-export',
      method: 'exportPrivateKey' as const,
      action: 'DENY' as const,
      conditions: [],
    },
  ];
}

/**
 * Creates the wallet policy.
 *
 * @param privy - Authenticated Privy client.
 * @param options - The ceiling to enforce.
 * @returns The new policy's id, or `null` when Privy rejected the request.
 * @remarks A failure is reported, not swallowed, but it does not block wallet
 * creation: Purse's own engine remains authoritative and always runs.
 */
export async function createWalletPolicy(
  privy: PrivyClient,
  options: WalletPolicyOptions,
): Promise<string | null> {
  try {
    const policy = await privy.walletApi.createPolicy({
      name: 'purse-wallet-controls',
      version: '1.0',
      chainType: 'ethereum',
      rules: walletPolicyRules(options),
    });
    return policy.id;
  } catch (cause) {
    process.emitWarning(
      `Privy policy creation failed; wallets rely on Purse policy alone. ${String(cause)}`,
    );
    return null;
  }
}
