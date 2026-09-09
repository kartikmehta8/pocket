'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useState } from 'react';

import { cn } from '@/lib/cn';
import type { CatalogResource } from '@/lib/marketplace';
import type { AgentSummary } from '@/lib/types';
import { CodeBlock } from '@/components/ui/code-block';

/** A prompt worth trying, and what the agent will do with it. */
interface Example {
  key: string;
  label: string;
  outcome: string;
  prompt: string;
}

/**
 * Builds prompts that reference this organization's real agent and the seller's
 * real feeds, so a reader can paste one and have it work.
 *
 * @param agent The agent to name, or `null` when none exists yet.
 * @param resources The seller's advertised feeds.
 * @returns Four prompts covering buying, refusal, budgeting and reporting.
 */
function buildExamples(agent: AgentSummary | null, resources: CatalogResource[]): Example[] {
  const name = agent?.id ?? 'your-agent-id';
  const cheapest = [...resources].sort((a, b) => Number(a.price) - Number(b.price))[0];
  const dearest = [...resources].sort((a, b) => Number(b.price) - Number(a.price))[0];
  const cheapUrl = cheapest?.url ?? 'http://localhost:8402/v1/market/prices';
  const dearUrl = dearest?.url ?? 'http://localhost:8402/v1/research/deep-dive';

  return [
    {
      key: 'buy',
      label: 'Buy data',
      outcome:
        'Fetches the paywalled URL, gets a 402, checks the policy, signs, settles on Hedera, and returns the data.',
      prompt: `Get current token prices from ${cheapUrl} using agent ${name}, then tell me which asset moved most in the last 24 hours.`,
    },
    {
      key: 'budget',
      label: 'Work to a budget',
      outcome:
        'Opens a task budget, then buys only what fits inside it. The second purchase is refused with the headroom left.',
      prompt: `Open a task budget of $0.10 for agent ${name} called "morning briefing". Then buy ${dearUrl} within it. If you cannot afford it, tell me what you can afford instead.`,
    },
    {
      key: 'check',
      label: 'Check first',
      outcome:
        'Previews the decision without spending anything, so the agent can plan before it commits.',
      prompt: `Before spending anything, check whether agent ${name} is allowed to pay $0.35 to a data provider for research. Tell me the daily headroom.`,
    },
    {
      key: 'report',
      label: 'Report on itself',
      outcome:
        'Reads the spend summary and the audit trail, including refusals, and explains what happened.',
      prompt: `Summarise what agent ${name} spent in the last 7 days, broken down by category. List anything that was blocked and why.`,
    },
  ];
}

/**
 * Prompts a reader can paste into a connected agent.
 *
 * Built from live state rather than written out, so the agent id and the URLs
 * are the ones this organization actually has. A prompt that needs editing
 * before it works is a prompt nobody tries.
 *
 * @param agents Agents in the organization.
 * @param resources The seller's advertised feeds.
 * @param mcpUrl Where the agent runtime connects.
 */
export function PromptExamples({
  agents,
  resources,
  mcpUrl,
}: {
  agents: AgentSummary[];
  resources: CatalogResource[];
  mcpUrl: string;
}) {
  const examples = buildExamples(agents[0] ?? null, resources);
  const [active, setActive] = useState(examples[0]?.key ?? 'buy');
  const example = examples.find((entry) => entry.key === active) ?? examples[0];

  return (
    <section className="border-border bg-secondary-soft flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-text text-md font-semibold tracking-tight">Try it</h2>
          <p className="text-text-muted mt-0.5 text-sm">
            {agents.length === 0
              ? 'Register an agent and these prompts will name it.'
              : 'Paste one of these into an agent connected to your MCP server.'}
          </p>
        </div>
        <code className="text-text-muted hidden font-mono text-xs sm:block">{mcpUrl}</code>
      </div>

      <ToggleGroup.Root
        type="single"
        value={active}
        onValueChange={(next) => {
          if (next !== '') setActive(next);
        }}
        aria-label="Example prompt"
        className="border-border bg-ash-100 inline-flex w-fit flex-wrap gap-0.5 rounded-md border p-0.5"
      >
        {examples.map((entry) => (
          <ToggleGroup.Item
            key={entry.key}
            value={entry.key}
            className={cn(
              'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium',
              'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
              'text-text-secondary hover:text-text',
              'data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-e1',
            )}
          >
            {entry.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      {example === undefined ? null : (
        <>
          <CodeBlock code={example.prompt} label="Example prompt" caption="Prompt" />
          <p className="text-text-muted text-xs leading-relaxed">{example.outcome}</p>
        </>
      )}
    </section>
  );
}
