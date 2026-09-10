/**
 * Demo seeding.
 *
 * Creates the organization, the Hermes agent, a wallet, a budget and a policy
 * that together reproduce the scenario in the implementation plan: a 20 USDC
 * daily allowance, a 2 USDC per-transaction ceiling, and a 0.50 USDC task
 * budget that the cheap resource fits inside and the expensive one does not.
 */

import { buildAdapters } from '@pocket/adapters';
import { decimalsOf, parseAmount } from '@pocket/core';
import {
  attachWallet,
  appendAuditEvent,
  createAgent,
  createOrganization,
  createTaskBudget,
  issueApiKey,
  closeDb,
  getDb,
  upsertBudget,
  upsertPolicy,
} from '@pocket/db';
import { loadConfig } from './config.js';

/** The address the demo seller asks to be paid at. */
const PAID_SERVICE_ADDRESS =
  process.env['PAID_SERVICE_ADDRESS'] ?? '0x000000000000000000000000000000000000dEaD';

/**
 * Seeds a complete, demo-ready organization.
 *
 * @returns Nothing. Prints the organization API key to stdout, which is the
 *   only time it is ever visible.
 */
async function seed(): Promise<void> {
  const config = loadConfig();
  const db = getDb(config.DATABASE_URL);
  const adapters = buildAdapters({ ...process.env, CHAIN: config.CHAIN });
  const chain = config.CHAIN;
  const decimals = decimalsOf('USDC');

  const org = await createOrganization(db, 'Pocket Demo Organization');
  const { plaintext: apiKey } = await issueApiKey(db, org.id, 'Seed key');
  const agent = await createAgent(db, {
    orgId: org.id,
    name: 'Hermes',
    description: 'Research agent that buys paid market data.',
    metadata: { runtime: 'hermes', model: 'openrouter' },
  });

  const provisioned = await adapters.wallet.createWallet({
    orgId: org.id,
    agentId: agent.id,
    chain,
  });
  const wallet = await attachWallet(db, {
    orgId: org.id,
    agentId: agent.id,
    provider: adapters.wallet.name,
    providerWalletId: provisioned.providerWalletId,
    address: provisioned.address,
    publicKey: provisioned.publicKey,
    chain,
  });

  await upsertBudget(db, agent.id, {
    asset: 'USDC',
    dailyLimit: parseAmount('20', decimals),
    perTransactionLimit: parseAmount('2', decimals),
  });

  await upsertPolicy(db, agent.id, {
    allowedAssets: ['USDC'],
    allowedChains: [chain],
    allowedCategories: ['research', 'data', 'inference', 'api'],
    maxTransactionAmount: parseAmount('2', decimals),
    trustedRecipients: [PAID_SERVICE_ADDRESS.toLowerCase()],
    unknownRecipientBehaviour: 'require_approval',
    approvalThreshold: parseAmount('1', decimals),
  });

  const task = await createTaskBudget(db, {
    orgId: org.id,
    agentId: agent.id,
    label: 'Research the current ETH ecosystem using paid data sources',
    asset: 'USDC',
    limit: parseAmount('0.50', decimals),
  });

  await appendAuditEvent(db, {
    orgId: org.id,
    actorType: 'system',
    action: 'org.seeded',
    subjectType: 'organization',
    subjectId: org.id,
    payload: { agent: agent.name, walletAddress: wallet.address, adapters: adapters.modes },
  });

  process.stdout.write(
    [
      '',
      'Pocket demo seeded.',
      '',
      `  Organization   ${org.id}`,
      `  Agent          ${agent.id}  (${agent.name})`,
      `  Wallet         ${wallet.address}  via ${adapters.wallet.name}`,
      `  Task budget    ${task.id}  (0.50 USDC)`,
      `  Adapters       wallet=${adapters.modes.wallet.provider} chain=${adapters.modes.chain.provider} analytics=${adapters.modes.analytics.provider}`,
      '',
      '  API key (shown once, copy it now):',
      `  ${apiKey}`,
      '',
      '  Present it to the API and the MCP server as a bearer token.',
      '',
    ].join('\n'),
  );

  await closeDb();
}

seed().catch((error: unknown) => {
  process.stderr.write(`Seeding failed: ${String(error)}\n`);
  process.exit(1);
});
