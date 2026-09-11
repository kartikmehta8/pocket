/**
 * Provisions the treasury that seeds new agents.
 *
 * Pocket hands every newly registered agent a little USDC so the operator can
 * finish the demo without visiting a third-party faucet. That money comes from
 * one wallet, minted through the same Privy app the agents use, so it lives in
 * an account the operator controls and can inspect.
 *
 * It is not an agent: it has no budget, no policy, and never spends on an
 * agent's behalf. It only pays out at provisioning time.
 *
 * Run once:  pnpm --filter @pocket/api exec tsx src/provision-treasury.ts
 */

import { buildAdapters } from '@pocket/adapters';
import { decimalsOf, formatAmount, type ChainId } from '@pocket/core';

/**
 * The point below which the treasury is warned about, in tinybars.
 *
 * @remarks Roughly forty transfers' worth. Enough warning to act on, rather
 * than a threshold that only trips once seeding has already stopped.
 */
const MIN_GAS = 100_000_000n;

async function main(): Promise<void> {
  const chain = (process.env['CHAIN'] ?? 'hedera-testnet') as ChainId;
  const adapters = buildAdapters({ ...process.env, CHAIN: chain });

  if (!adapters.modes.wallet.live) {
    throw new Error('Privy is not configured. Set PRIVY_APP_ID and PRIVY_APP_SECRET first.');
  }

  const address = process.env['TREASURY_ADDRESS'] ?? '';
  const walletId = process.env['TREASURY_WALLET_ID'] ?? '';

  // Already provisioned: report what it holds, which is the question an
  // operator actually has when they re-run this.
  if (address !== '' && walletId !== '') {
    const [usdc, gas] = await Promise.all([
      adapters.chain.getBalance(address, 'USDC'),
      adapters.chain.getBalance(address, 'HBAR'),
    ]);
    process.stdout.write(
      `Treasury is ${address}, holding ${formatAmount(usdc, decimalsOf('USDC'))} USDC ` +
        `and ${formatAmount(gas, decimalsOf('HBAR'))} HBAR.\n`,
    );
    if (usdc === 0n) {
      process.stdout.write('  No USDC. New agents will be provisioned with nothing.\n');
    }
    // Both matter, and running out of gas looks exactly like running out of
    // money: the transfer is refused and the agent is provisioned empty.
    if (gas < MIN_GAS) {
      process.stdout.write(
        `  Low on HBAR. Every seed is an ordinary transfer the treasury pays gas for,\n` +
          `  so it stops funding agents long before the USDC runs out.\n`,
      );
    }
    return;
  }

  const provisioned = await adapters.wallet.createWallet({
    orgId: 'treasury',
    agentId: 'treasury',
    chain,
  });

  process.stdout.write(
    [
      'Treasury wallet created. Add these to the API environment:\n\n',
      `  TREASURY_WALLET_ID=${provisioned.providerWalletId}\n`,
      `  TREASURY_ADDRESS=${provisioned.address}\n`,
      `  AGENT_SEED_AMOUNT=0.02\n\n`,
      'Then fund the address with USDC, and with a little HBAR — every seed is\n',
      'an ordinary transfer the treasury pays gas for. Until it holds both,\n',
      'agents are provisioned empty and the funding step asks for a faucet.\n',
    ].join(''),
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
