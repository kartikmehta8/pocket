import { Clock, Database } from 'lucide-react';

import { formatDateTime } from '@/lib/format';
import type { CatalogResource } from '@/lib/marketplace';
import type { AgentSummary } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Hint } from '@/components/ui/tooltip';
import { BuyForm } from './buy-form';

/**
 * One purchasable feed: what it is, where the data comes from, what it costs,
 * and the control that buys it.
 *
 * The provider is named on the card. A buyer paying for data deserves to know
 * whose data it is before they pay, not after.
 *
 * @param resource The seller's advertised feed.
 * @param agents Agents that could pay for it.
 */
export function ResourceCard({
  resource,
  agents,
}: {
  resource: CatalogResource;
  agents: AgentSummary[];
}) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-text text-sm font-semibold tracking-tight">{resource.title}</h3>
            <p className="text-text-secondary mt-1 text-sm leading-relaxed">
              {resource.description}
            </p>
          </div>
          <Hint label="Charged per call, settled in stablecoin on Hedera. The seller quotes this price in its 402 response; Pocket evaluates the same number.">
            <span className="text-text figures shrink-0 cursor-help text-sm font-semibold">
              {resource.price}
              <span className="text-text-muted ml-1 text-xs font-medium">
                {resource.assetSymbol}
              </span>
            </span>
          </Hint>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            tone="neutral"
            icon={Database}
            hint={`Pocket does not generate this data. It is fetched live from ${resource.provider}.`}
          >
            {resource.provider}
          </Badge>
          {resource.stale ? (
            <Badge
              tone="warning"
              icon={Clock}
              hint="The seller's last refresh failed, so it is serving its previous snapshot. The response says exactly how old it is."
            >
              Stale
            </Badge>
          ) : (
            <Badge
              tone="neutral"
              icon={Clock}
              hint={
                resource.asOf === null
                  ? 'Not yet fetched.'
                  : `Last refreshed ${formatDateTime(resource.asOf)}. The seller refreshes every ${resource.refreshSeconds}s.`
              }
            >
              {resource.refreshSeconds}s refresh
            </Badge>
          )}
        </div>

        <p className="text-text-muted text-xs leading-relaxed">{resource.useCase}</p>

        <div className="mt-auto pt-1">
          <BuyForm
            agents={agents}
            url={resource.url}
            reason={`${resource.title} from ${resource.provider}`}
            category="data"
          />
        </div>
      </CardContent>
    </Card>
  );
}
