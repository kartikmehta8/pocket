'use client';

import { ArrowUpRight, Bot } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { formatAmount, usageRatio } from '@/lib/format';
import type { CatalogResource } from '@/lib/marketplace';
import type { AgentSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { InlineCode } from '@/components/ui/inline-code';
import { Meter } from '@/components/ui/meter';
import { Stagger, StaggerItem } from '@/components/ui/reveal';
import { Select } from '@/components/ui/select';
import { BuyForm } from './buy-form';
import { ResourceCard } from './resource-card';

/**
 * Who pays, chosen once for every purchase on the page.
 *
 * @param agents Agents that could pay, revoked ones already removed.
 * @param agentId The chosen agent.
 * @param onChange Called with the new agent id.
 */
function Payer({
  agents,
  agentId,
  onChange,
}: {
  agents: AgentSummary[];
  agentId: string;
  onChange: (id: string) => void;
}) {
  const id = useId();
  const agent = agents.find((entry) => entry.id === agentId) ?? agents[0];

  if (agent === undefined) {
    return (
      <Card pop>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="border-border bg-surface text-accent-600 flex size-9 shrink-0 items-center justify-center rounded-md border">
              <Bot aria-hidden className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-text text-sm font-medium">Register an agent to buy</p>
              <p className="text-text-secondary mt-0.5 text-sm leading-relaxed">
                Every purchase is made from an agent&rsquo;s wallet, under its policy. You can still
                browse what is for sale.
              </p>
            </div>
          </div>
          <Button variant="primary" asChild>
            <Link href="/setup">
              Connect an agent
              <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const asset = agent.budget?.asset ?? 'USDC';

  return (
    <Card pop>
      <CardContent className="grid items-end gap-4 pt-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <Field htmlFor={id} label="Pay from">
          <Select
            id={id}
            value={agent.id}
            onValueChange={onChange}
            options={agents.map((entry) => ({
              value: entry.id,
              label: entry.status === 'paused' ? `${entry.name} (paused)` : entry.name,
            }))}
          />
        </Field>

        {agent.budget === null ? (
          <p className="text-text-muted text-sm leading-relaxed md:pb-2">
            No daily budget set. Every purchase will be refused until one is.{' '}
            <Link
              href={`/agents/${agent.id}`}
              className="text-text font-medium underline decoration-dotted underline-offset-4"
            >
              Set a budget
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-1.5 md:pb-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="eyebrow">Left today</span>
              <span className="figures text-text font-semibold">
                {formatAmount(agent.spend.dailyRemaining, asset)}
              </span>
            </div>
            <Meter
              ratio={usageRatio(agent.spend.today, agent.budget.dailyLimit)}
              label={`${agent.name} daily budget used`}
              valueText={`${formatAmount(agent.spend.today, null)} of ${formatAmount(agent.budget.dailyLimit, asset)} spent today`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The marketplace body: who pays, what is for sale, and a way to buy anything
 * else.
 *
 * @param resources The seller's advertised feeds.
 * @param agents Every agent in the organization.
 * @remarks Revoked agents are not offered. They cannot pay, and listing them
 * would only produce a refusal the reader could have been spared.
 */
export function Marketplace({
  resources,
  agents,
}: {
  resources: CatalogResource[];
  agents: AgentSummary[];
}) {
  const payers = agents.filter((agent) => agent.status !== 'revoked');
  const [chosen, setChosen] = useState(payers.find((agent) => agent.status === 'active')?.id ?? '');
  // Falls back to the first payer when the chosen one is no longer offered.
  const agentId = payers.some((agent) => agent.id === chosen) ? chosen : (payers[0]?.id ?? '');

  return (
    <>
      <Payer agents={payers} agentId={agentId} onChange={setChosen} />

      <Stagger className="grid gap-4 md:grid-cols-2">
        {resources.map((resource) => (
          <StaggerItem key={resource.path}>
            <ResourceCard resource={resource} agentId={agentId} />
          </StaggerItem>
        ))}
      </Stagger>

      {agentId === '' ? null : (
        <Card pop>
          <CardHeader>
            <div>
              <CardTitle>Buy from any x402 seller</CardTitle>
              <CardDescription>
                Pocket is not a marketplace. Any URL that answers{' '}
                <InlineCode>402 Payment Required</InlineCode> with x402 terms can take your
                agent&rsquo;s money.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BuyForm
              agentId={agentId}
              url=""
              reason="Purchased from the Pocket dashboard"
              category="data"
              label="Fetch and pay"
              editableUrl
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
