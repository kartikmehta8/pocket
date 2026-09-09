import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Wallet } from 'lucide-react';

import { getPaymentStats, listAgents, listApiKeys } from '@/lib/api';
import { serviceUrls } from '@/lib/urls';
import { ApiKeyMinter } from '@/components/setup/api-key-minter';
import { HermesConnect } from '@/components/setup/hermes-connect';
import { Step } from '@/components/setup/step';
import { AgentCreateForm } from '@/components/agents/agent-create-form';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { InlineCode } from '@/components/ui/inline-code';
import { PageHeader } from '@/components/ui/page-header';
import { Hint } from '@/components/ui/tooltip';

export const metadata: Metadata = { title: 'Connect an agent' };

/** Live state decides which steps show as done, so nothing is prerendered. */
export const dynamic = 'force-dynamic';

/** Faucet for the testnet Pocket settles on by default. */
const FAUCET_URL = 'https://portal.hedera.com/faucet';

/**
 * Setup: five steps from an empty organization to an agent that has paid for
 * something, each marked done from live state rather than a remembered click.
 */
export default async function SetupPage() {
  const [agentsResult, keysResult, statsResult] = await Promise.all([
    listAgents(),
    listApiKeys(),
    getPaymentStats({ days: 30 }),
  ]);

  const agents = agentsResult.ok ? agentsResult.data.agents : [];
  const agent = agents[0] ?? null;
  // Key management needs a signed-in person. In API-key mode the call is
  // refused, which is not an error worth showing — the step just explains why.
  const keys = keysResult.ok ? keysResult.data.keys.filter((key) => key.revokedAt === null) : [];
  const settled = statsResult.ok ? statsResult.data.settled : 0;

  const urls = serviceUrls();
  const funded = agents.some((entry) => entry.budget !== null);

  return (
    <>
      <PageHeader
        eyebrow="Getting started"
        title="Connect an agent"
        description="Five steps from an empty organization to an agent that pays for its own data."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/agents">
              Agents
              <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
            </Link>
          </Button>
        }
      />

      <ol className="flex flex-col">
        <Step
          index={1}
          title="Register an agent"
          summary="Pocket provisions a Privy-custodied wallet for it. No key ever reaches your server or the model."
          done={agent !== null}
        >
          {agent === null ? (
            <AgentCreateForm />
          ) : (
            <CodeBlock
              code={agent.wallet?.address ?? 'Wallet pending'}
              label={`${agent.name} wallet address`}
              caption={
                <span className="flex items-center gap-1.5">
                  <Wallet aria-hidden className="size-3.5" strokeWidth={1.75} />
                  {agent.name} · {agent.wallet?.chain ?? 'unassigned'}
                </span>
              }
            />
          )}
        </Step>

        <Step
          index={2}
          title="Fund the wallet"
          summary="Send test USDC to the address above. The wallet is opted into the token automatically when it is created."
          done={funded}
        >
          <p className="text-text-secondary text-sm leading-relaxed">
            On Hedera testnet, use the portal faucet for HBAR and the USDC test token. Balances show
            on the agent page once the transfer confirms.
          </p>
          <div>
            <Button variant="secondary" asChild>
              <a href={FAUCET_URL} target="_blank" rel="noreferrer noopener">
                Hedera faucet
                <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
              </a>
            </Button>
          </div>
        </Step>

        <Step
          index={3}
          title="Set a budget and a policy"
          summary="Until both exist the agent cannot spend anything. That is the deny-by-default rule, not a missing feature."
          done={agent?.budget !== null && agent !== null}
        >
          <p className="text-text-secondary text-sm leading-relaxed">
            The budget sets a daily ceiling and a per-transaction ceiling. The policy names which
            assets, chains, categories and recipients are allowed, and the amount above which a
            human has to approve.
          </p>
          {agent === null ? null : (
            <div>
              <Button variant="secondary" asChild>
                <Link href={`/agents/${agent.id}`}>
                  Configure {agent.name}
                  <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
                </Link>
              </Button>
            </div>
          )}
        </Step>

        <Step
          index={4}
          title="Create an API key for the MCP server"
          summary="The MCP server presents this key. Your agent never sees it, so it cannot appear in a completion."
          done={keys.length > 0}
        >
          {keysResult.ok ? (
            <ApiKeyMinter existing={keys.length} />
          ) : (
            <p className="text-text-secondary text-sm leading-relaxed">
              This dashboard is running with <InlineCode>POCKET_API_KEY</InlineCode> set, so it is
              authenticated as a machine rather than a person. Sign in to manage keys.
            </p>
          )}
        </Step>

        <Step
          index={5}
          title="Point your agent runtime at the MCP server"
          summary="One command. The server exposes eight tools: paying for a resource, previewing a decision, opening a task budget, and reading spend."
          done={settled > 0}
          last
        >
          <HermesConnect url={urls.mcp} />

          <div className="border-border bg-ash-50 rounded-md border p-3">
            <p className="text-text text-sm font-medium">Then ask it to buy something</p>
            <p className="text-text-secondary mt-1 text-sm leading-relaxed">
              Name the agent and the ceiling in the prompt. Pocket evaluates the policy before
              anything is signed, and a refusal comes back to the agent as a reason it can act on.
            </p>
            <CodeBlock
              className="mt-2.5"
              label="Example prompt"
              caption="Prompt"
              code={
                agent === null
                  ? 'Get current token prices from a paid data feed. Spend up to $0.50.'
                  : `Get current token prices from ${
                      urls.paidService ?? 'http://localhost:8402'
                    }/v1/market/prices using agent ${agent.id}, then tell me which asset moved most in the last 24 hours.`
              }
            />
          </div>

          <p className="text-text-muted text-xs leading-relaxed">
            <Hint label="Every attempt is recorded, including the ones policy refused. A blocked payment is a row with a reason, not a discarded event.">
              <span className="cursor-help underline decoration-dotted underline-offset-2">
                Watch it happen
              </span>
            </Hint>{' '}
            on{' '}
            <Link href="/payments" className="text-accent-600 hover:underline">
              Payments
            </Link>{' '}
            and{' '}
            <Link href="/audit" className="text-accent-600 hover:underline">
              Audit
            </Link>
            .
          </p>
        </Step>
      </ol>
    </>
  );
}
