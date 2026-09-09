import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Coins, Eye, KeyRound, Landmark, Network } from 'lucide-react';

import { listAgents } from '@/lib/api';
import { CAPABILITIES, INTEGRATIONS } from '@/lib/capabilities';
import { getCatalog } from '@/lib/marketplace';
import { serviceUrls } from '@/lib/urls';
import { PromptExamples } from '@/components/capabilities/prompt-examples';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Stagger, StaggerItem } from '@/components/ui/reveal';
import { Hint } from '@/components/ui/tooltip';

export const metadata: Metadata = { title: 'What your agent can do' };

/** Reads live agents and the live catalog to build real example prompts. */
export const dynamic = 'force-dynamic';

/** Icon per vendor, matched by name. Icons cannot live in the data module. */
const INTEGRATION_ICONS = { Privy: KeyRound, Hedera: Landmark, 'The Graph': Network } as const;

/**
 * Capabilities: the full set of things a connected agent can do, why each one
 * matters, and prompts that actually work against this organization.
 */
export default async function CapabilitiesPage() {
  const [agentsResult, catalog] = await Promise.all([listAgents(), getCatalog()]);
  const agents = agentsResult.ok ? agentsResult.data.agents : [];
  const urls = serviceUrls();

  return (
    <>
      <PageHeader
        eyebrow="Reference"
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

      <PromptExamples agents={agents} resources={catalog.resources} mcpUrl={urls.mcp} />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-text text-md font-semibold tracking-tight">Tools</h2>
          <p className="text-text-muted mt-0.5 text-sm">
            Exactly what is registered on the MCP server, in the order an agent tends to need them.
          </p>
        </div>

        <Stagger className="grid gap-3 md:grid-cols-2">
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

      <Card>
        <CardHeader>
          <div>
            <CardTitle>What makes it work</CardTitle>
            <CardDescription>
              Three vendors, each responsible for one thing Purse deliberately does not do itself.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {INTEGRATIONS.map((integration) => {
            const Icon = INTEGRATION_ICONS[integration.name as keyof typeof INTEGRATION_ICONS];
            return (
              <div key={integration.name} className="flex flex-col gap-2">
                <span className="border-border bg-accent-100 text-accent-700 flex size-8 items-center justify-center rounded-md border">
                  <Icon aria-hidden className="size-4" strokeWidth={1.75} />
                </span>
                <div>
                  <Hint label={integration.detail}>
                    <p className="text-text cursor-help text-sm font-medium underline decoration-dotted underline-offset-4">
                      {integration.name}
                    </p>
                  </Hint>
                  <p className="eyebrow mt-0.5">{integration.role}</p>
                </div>
                <p className="text-text-secondary text-xs leading-relaxed">{integration.detail}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
