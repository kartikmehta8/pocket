/**
 * Provisions the demo seller's wallet.
 *
 * The paid service is an independent business, so its wallet does not belong
 * in Pocket's agent table. This mints one through the same Privy app the agents
 * use, which means it lives in an account the operator controls and can be
 * inspected in the Privy dashboard.
 *
 * Run once:  pnpm --filter @pocket/api exec tsx src/provision-merchant.ts
 */

import { buildAdapters } from '@pocket/adapters';
import { decimalsOf, formatAmount, type AssetId, type ChainId } from '@pocket/core';

/** The placeholder that must not survive into a live configuration. */
const BURN_PLACEHOLDER = '0x000000000000000000000000000000000000dead';

/**
 * Provisions the seller's wallet, or associates its token.
 *
 * Runs in two passes. The first mints the wallet and prints the address to put
 * in `.env`. Once that address holds a little HBAR, running it again performs
 * the token association, which needs the wallet to exist on chain and hold gas.
 *
 * @throws {Error} When Privy is not configured, or when the address is set but
 *   the wallet id is not.
 */
async function main(): Promise<void> {
  const chain = (process.env['CHAIN'] ?? 'hedera-testnet') as ChainId;
  const asset: AssetId = process.env['HEDERA_USDC_ADDRESS'] ? 'USDC' : 'HBAR';
  const adapters = buildAdapters({ ...process.env, CHAIN: chain });

  if (!adapters.modes.wallet.live) {
    throw new Error('Privy is not configured. Set PRIVY_APP_ID and PRIVY_APP_SECRET first.');
  }

  const existing = process.env['PAID_SERVICE_ADDRESS'] ?? '';
  const walletId = process.env['MERCHANT_PRIVY_WALLET_ID'] ?? '';
  const provisioned = existing !== '' && existing.toLowerCase() !== BURN_PLACEHOLDER;

  if (provisioned) {
    if (asset === 'HBAR') {
      process.stdout.write(`Seller is ${existing}, settling in HBAR. No association needed.\n`);
      return;
    }
    if (walletId === '') {
      throw new Error(
        'MERCHANT_PRIVY_WALLET_ID is not set, so the seller wallet cannot be associated. ' +
          'Add the wallet id this script printed when it created the wallet.',
      );
    }
    const already = await adapters.chain.isTokenAssociated(existing, asset);
    if (already === true) {
      process.stdout.write(`Seller ${existing} is already associated with ${asset}.\n`);
      return;
    }
    const submitted = await adapters.wallet.associateToken({
      providerWalletId: walletId,
      address: existing,
      asset,
      chain,
      idempotencyKey: `merchant-associate:${asset}`,
    });
    process.stdout.write(
      `Associated ${existing} with ${asset}. tx ${submitted?.txHash ?? 'n/a'}\n`,
    );
    return;
  }

  const wallet = await adapters.wallet.createWallet({
    orgId: 'merchant',
    agentId: 'merchant',
    chain,
  });

  let balance = 0n;
  try {
    balance = await adapters.chain.getBalance(wallet.address, 'HBAR');
  } catch {
    balance = 0n;
  }

  process.stdout.write(
    [
      '',
      'Seller wallet provisioned through Privy.',
      '',
      `  Address        ${wallet.address}`,
      `  Privy wallet   ${wallet.providerWalletId}`,
      `  Chain          ${chain}`,
      `  HBAR balance   ${formatAmount(balance, decimalsOf('HBAR'))}`,
      '',
      '  Put both of these in .env:',
      `  PAID_SERVICE_ADDRESS=${wallet.address}`,
      `  MERCHANT_PRIVY_WALLET_ID=${wallet.providerWalletId}`,
      '',
      asset === 'USDC'
        ? '  Next: fund it with testnet HBAR, then re-run this script to associate it.\n'
        : '  Settling in HBAR, so no token association is needed.\n',
    ].join('\n'),
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`Provisioning failed: ${String(error)}\n`);
  process.exit(1);
});
