/**
 * The marketplace. Paid feeds from the example seller, bought with a chosen
 * agent through the same policy engine an agent uses.
 */

import type { Metadata } from 'next';
import { PackageOpen } from 'lucide-react';

import { listAgents } from '@/lib/api';
import { getCatalog } from '@/lib/marketplace';
import { Marketplace } from '@/components/marketplace/marketplace';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

/**
 * A purchase waits on a 402 handshake, a wallet signature and settlement on
 * Hedera, which together run five to nine seconds. Serverless platforms cut a
 * request off well before that by default, and the payment would settle on
 * chain with the buyer told it failed.
 */
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Marketplace',
  description:
    "Paid data feeds, priced per call and settled in stablecoin. Every purchase goes through the same policy engine an agent's does.",
};

/** Prices and freshness are live; nothing here is prerendered. */
export const dynamic = 'force-dynamic';

/**
 * Marketplace: the paid resources an agent can buy, and a way to buy any other.
 *
 * Everything listed is backed by a real upstream — CoinGecko, a public
 * Ethereum node, DefiLlama — so buying one is the same transaction a developer
 * makes when they pay a data provider per call. The paying agent is chosen
 * once, above the grid, rather than on every card.
 */
export default async function MarketplacePage() {
  const [catalog, agentsResult] = await Promise.all([getCatalog(), listAgents()]);
  const agents = agentsResult.ok ? agentsResult.data.agents : [];

  return (
    <>
      <PageHeader
        title="Marketplace"
        description="Paid data feeds, priced per call and settled in stablecoin. Every purchase goes through the same policy engine an agent's does."
      />

      {catalog.resources.length === 0 ? (
        <Card>
          <EmptyState
            icon={PackageOpen}
            title="No catalog available"
            description={catalog.error ?? 'The seller is offering nothing right now.'}
          />
        </Card>
      ) : (
        <Marketplace resources={catalog.resources} agents={agents} />
      )}
    </>
  );
}
