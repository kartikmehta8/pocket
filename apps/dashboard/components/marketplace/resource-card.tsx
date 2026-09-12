import { ArrowUpRight, Clock, Link2 } from 'lucide-react';
import Image from 'next/image';

import { formatDateTime } from '@/lib/format';
import type { CatalogResource } from '@/lib/marketplace';
import { providerMarks } from '@/lib/providers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { InfoHint } from '@/components/ui/info-hint';
import { Hint } from '@/components/ui/tooltip';
import { BuyForm } from './buy-form';

/**
 * Where a feed's data comes from: the vendors' marks, then their names.
 *
 * @param provider The provider line as the seller advertises it.
 * @remarks The names are always text beside the marks. A logo the reader does
 * not recognise says nothing, and a buyer deserves to know whose data they are
 * paying for before they pay.
 */
function Providers({ provider }: { provider: string }) {
  const marks = providerMarks(provider);
  const names = marks.map((mark) => mark.name).join(', ');
  return (
    <Hint label={`Pocket does not generate this data. It is fetched live from ${names}.`}>
      <div className="flex min-w-0 cursor-help items-center gap-2">
        <div className="flex shrink-0 -space-x-1.5">
          {marks.map((mark) => (
            <span
              key={mark.name}
              className="ring-surface bg-ash-100 flex size-6 items-center justify-center overflow-hidden rounded-full ring-2"
            >
              {mark.logo === null ? (
                <span aria-hidden className="bg-ash-300 size-1.5 rounded-full" />
              ) : (
                <Image
                  src={mark.logo}
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  className="size-full object-cover"
                />
              )}
            </span>
          ))}
        </div>
        <span className="text-text-secondary text-xs leading-snug font-medium">{names}</span>
      </div>
    </Hint>
  );
}

/**
 * One purchasable feed: whose data it is, what it is, what it costs, and one
 * button that buys it.
 *
 * @param resource The seller's advertised feed.
 * @param agentId The agent paying, or `''` when none is registered yet.
 */
export function ResourceCard({
  resource,
  agentId,
}: {
  resource: CatalogResource;
  agentId: string;
}) {
  const price = `${resource.price} ${resource.assetSymbol}`;
  // Host and path only. The scheme is noise at this size, and the copy button
  // hands over the full URL anyway.
  const endpoint = resource.url.replace(/^https?:\/\//, '');

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <Providers provider={resource.provider} />
          <Hint label="Charged per call, settled in stablecoin on Hedera. The seller quotes this price in its 402 response; Pocket evaluates the same number.">
            <span className="text-text figures shrink-0 cursor-help text-sm font-semibold tracking-tight">
              {resource.price}
              <span className="text-text-muted ml-1 text-xs font-medium">
                {resource.assetSymbol}
              </span>
            </span>
          </Hint>
        </div>

        <div>
          <h3 className="text-text text-md font-semibold tracking-tight">{resource.title}</h3>
          <p className="text-text-secondary mt-1 text-sm leading-relaxed">{resource.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
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
              Refreshes every {resource.refreshSeconds}s
            </Badge>
          )}
        </div>

        <p className="text-text-muted text-xs leading-relaxed">{resource.useCase}</p>

        {/* The address an agent actually pays, given a surface of its own: it
            is the one thing on the card a reader might take somewhere else.
            Opening it in a browser shows the seller's 402 and its terms, which
            is the whole handshake in one click. */}
        <div className="mt-auto pt-1">
          <p className="eyebrow mb-1.5 flex items-center gap-1">
            Paid endpoint
            <InfoHint
              subject="the paid endpoint"
              label="The URL your agent buys from. Opening it in a browser returns the seller's 402 with its price and terms, because nothing has paid for it yet."
            />
          </p>
          <div className="border-border bg-ash-25 flex items-center gap-1.5 rounded-md border px-2 py-1.5">
            <Link2 aria-hidden className="text-ash-400 size-3.5 shrink-0" strokeWidth={2} />
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-text hover:text-accent-700 inline-flex min-w-0 flex-1 items-center gap-1 rounded-sm font-mono text-xs font-medium"
            >
              <span className="truncate">{endpoint}</span>
              <ArrowUpRight aria-hidden className="size-3 shrink-0 opacity-60" strokeWidth={2} />
            </a>
            <CopyButton value={resource.url} label={`${resource.title} URL`} />
          </div>
        </div>

        {agentId === '' ? null : (
          <BuyForm
            agentId={agentId}
            url={resource.url}
            reason={`${resource.title} from ${resource.provider}`}
            category="data"
            label={`Buy for ${price}`}
          />
        )}
      </CardContent>
    </Card>
  );
}
