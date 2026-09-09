import type { Metadata } from 'next';
import { PackageOpen } from 'lucide-react';

import { listAgents } from '@/lib/api';
import { getCatalog } from '@/lib/marketplace';
import { ResourceCard } from '@/components/marketplace/resource-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineCode } from '@/components/ui/inline-code';
import { PageHeader } from '@/components/ui/page-header';
import { Stagger, StaggerItem } from '@/components/ui/reveal';
import { BuyForm } from '@/components/marketplace/buy-form';

export const metadata: Metadata = { title: 'Marketplace' };

/** Prices and freshness are live; nothing here is prerendered. */
export const dynamic = 'force-dynamic';

/**
 * Marketplace: the paid resources an agent can buy, and a way to buy any other.
 *
 * Everything listed is backed by a real upstream — CoinGecko, a public
 * Ethereum node, DefiLlama — so buying one is the same transaction a developer
 * makes when they pay a data provider per call.
 */
export default async function MarketplacePage() {
  const [catalog, agentsResult] = await Promise.all([getCatalog(), listAgents()]);
  const agents = agentsResult.ok ? agentsResult.data.agents : [];

  return (
    <>
      <PageHeader
        eyebrow="Buy"
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
        <Stagger className="grid gap-4 md:grid-cols-2">
          {catalog.resources.map((resource) => (
            <StaggerItem key={resource.path}>
              <ResourceCard resource={resource} agents={agents} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Buy from any x402 seller</CardTitle>
            <CardDescription>
              Any URL that answers <InlineCode>402 Payment Required</InlineCode> with x402 terms
              Pocket can settle.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <BuyForm
            agents={agents}
            url=""
            reason="Purchased from the Pocket dashboard"
            category="data"
            label="Fetch and pay"
            editableUrl
          />
        </CardContent>
      </Card>
    </>
  );
}
