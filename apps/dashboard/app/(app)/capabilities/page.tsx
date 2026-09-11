import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Coins, Eye } from 'lucide-react';

import { listAgents } from '@/lib/api';
import { CAPABILITIES, INTEGRATIONS } from '@/lib/capabilities';
import { getCatalog } from '@/lib/marketplace';
import { PromptExamples } from '@/components/capabilities/prompt-examples';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Stagger, StaggerItem } from '@/components/ui/reveal';

export const metadata: Metadata = { title: 'What your agent can do' };

/** Reads live agents and the live catalog to build real example prompts. */
export const dynamic = 'force-dynamic';

/**
 * Capabilities: the full set of things a connected agent can do, why each one
 * matters, and prompts that actually work against this organization.
 */
export default async function CapabilitiesPage() {
  const [agentsResult, catalog] = await Promise.all([listAgents(), getCatalog()]);
  const agents = agentsResult.ok ? agentsResult.data.agents : [];

  return (
    <>
      <PageHeader
        title="What your agent can do"
        description="Eight tools reach your agent over MCP. One of them can move money; the other seven exist so it does not have to guess."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/setup">
              Connection steps
              <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
            </Link>
          </Button>
        }
      />

      <PromptExamples agents={agents} resources={catalog.resources} />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-text text-md font-semibold tracking-tight">Tools</h2>
          <p className="text-text-muted mt-0.5 text-sm">
            Exactly what is registered on the MCP server, in the order an agent tends to need them.
          </p>
        </div>

        <Stagger className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          {CAPABILITIES.map((capability) => (
            <StaggerItem key={capability.tool}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-2 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-text text-sm font-semibold tracking-tight">
                      {capability.title}
                    </h3>
                    {capability.spends ? (
                      <Badge
                        tone="warning"
                        icon={Coins}
                        hint="This is the only tool that can move money, and it cannot do so unless the policy engine allows the specific payment."
                      >
                        Spends
                      </Badge>
                    ) : (
                      <Badge
                        tone="neutral"
                        icon={Eye}
                        hint="Read-only. It cannot change state or move money."
                      >
                        Reads
                      </Badge>
                    )}
                  </div>
                  <code className="text-text-muted font-mono text-xs">{capability.tool}</code>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {capability.summary}
                  </p>
                  <p className="text-text-muted mt-auto pt-1 text-xs leading-relaxed">
                    {capability.why}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-text text-md font-semibold tracking-tight">What makes it work</h2>
          <p className="text-text-muted mt-0.5 text-sm">
            Three vendors, each responsible for one thing Pocket deliberately does not do itself.
          </p>
        </div>

        <Stagger className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
          {INTEGRATIONS.map((integration) => (
            <StaggerItem key={integration.name}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3 pt-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
                      <Image
                        src={integration.logo}
                        alt=""
                        width={40}
                        height={40}
                        unoptimized
                        className="size-full object-contain"
                      />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-text text-sm font-semibold tracking-tight">
                        {integration.name}
                      </h3>
                      <p className="eyebrow mt-0.5">{integration.role}</p>
                    </div>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {integration.detail}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}
