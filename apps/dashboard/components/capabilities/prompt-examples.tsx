'use client';

/**
 * The ready-made prompts on the capabilities screen.
 */

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
 *
 * @remarks The agent is named, not identified. A runtime resolves the name
 * through pocket_list_agents, and a person reading the prompt knows who it is
 * about.
 *
 * Placeholders, not a guess at an address: a prompt that names a service nobody
 * has deployed should read as one to edit, not one to run.
 */
function buildExamples(agent: AgentSummary | null, resources: CatalogResource[]): Example[] {
  const who = agent === null ? 'my agent' : `my agent "${agent.name}"`;
  const cheapest = [...resources].sort((a, b) => Number(a.price) - Number(b.price))[0];
  const dearest = [...resources].sort((a, b) => Number(b.price) - Number(a.price))[0];
  const cheapUrl = cheapest?.url ?? '<paid resource URL>';
  const dearUrl = dearest?.url ?? '<paid resource URL>';

  return [
    {
      key: 'buy',
      label: 'Buy data',
      outcome:
        'Fetches the paywalled URL, gets a 402, checks the policy, signs, settles on Hedera, and returns the data.',
      prompt: `Using ${who}, get current token prices from ${cheapUrl} and tell me which asset moved most in the last 24 hours.`,
    },
    {
      key: 'budget',
      label: 'Work to a budget',
      outcome:
        'Opens a task budget, then buys only what fits inside it. The second purchase is refused with the headroom left.',
      prompt: `Open a task budget of $0.10 for ${who} called "morning briefing". Then buy ${dearUrl} within it. If it does not fit, tell me what would.`,
    },
    {
      key: 'check',
      label: 'Check first',
      outcome:
        'Previews the decision without spending anything, so the agent can plan before it commits.',
      prompt: `Before spending anything, check whether ${who} is allowed to pay $0.35 to a data provider for research. Tell me the daily headroom.`,
    },
    {
      key: 'report',
      label: 'Report on itself',
      outcome:
        'Reads the spend summary and the audit trail, including refusals, and explains what happened.',
      prompt: `Summarise what ${who} spent in the last 7 days, broken down by category. List anything that was blocked and why.`,
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
 * @remarks Styled as the landing page's closing banner: the same blue, the
 * same hard shadow, the same hairline. It is the one place on this page that
 * asks the reader to do something, and it should look like it.
 */
export function PromptExamples({
  agents,
  resources,
}: {
  agents: AgentSummary[];
  resources: CatalogResource[];
}) {
  const examples = buildExamples(agents[0] ?? null, resources);
  const [active, setActive] = useState(examples[0]?.key ?? 'buy');
  const example = examples.find((entry) => entry.key === active) ?? examples[0];

  return (
    <section className="border-border bg-accent-600 shadow-pop overflow-hidden rounded-lg border">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Try it</h2>
            <p className="mt-2 max-w-md leading-relaxed text-white/80">
              {agents.length === 0
                ? 'Register an agent and these prompts will name it.'
                : 'Paste one of these into an agent connected to Pocket.'}
            </p>
          </div>

          <ToggleGroup.Root
            type="single"
            value={active}
            onValueChange={(next) => {
              if (next !== '') setActive(next);
            }}
            aria-label="Example prompt"
            className="inline-flex w-fit flex-wrap gap-1 rounded-md border border-white/25 bg-white/10 p-1"
          >
            {examples.map((entry) => (
              <ToggleGroup.Item
                key={entry.key}
                value={entry.key}
                className={cn(
                  'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium',
                  'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
                  'text-white/75 hover:text-white',
                  'data-[state=on]:text-accent-700 data-[state=on]:shadow-e1 data-[state=on]:bg-white',
                )}
              >
                {entry.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>

          {example === undefined ? null : (
            <p className="text-sm leading-relaxed text-white/75">{example.outcome}</p>
          )}
        </div>

        {example === undefined ? null : (
          <CodeBlock
            wrap
            code={example.prompt}
            label="Example prompt"
            caption="Prompt"
            className="shadow-pop-sm self-start"
          />
        )}
      </div>
    </section>
  );
}
