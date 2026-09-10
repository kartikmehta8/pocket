import { Bot, Coins, Gauge, KeyRound, PlugZap, ShieldHalf, ShoppingCart } from 'lucide-react';

import type { AgentDetail, AgentSummary } from '@/lib/types';
import { ApiKeyMinter } from './api-key-minter';
import { ConfigureStep } from './configure-step';
import { FirstPurchase } from './first-purchase';
import { FundStep } from './fund-step';
import { HermesConnect } from './hermes-connect';
import { Step, type StepState } from './step';
import { AgentCreateForm } from '@/components/agents/agent-create-form';
import { CodeBlock } from '@/components/ui/code-block';
import { InlineCode } from '@/components/ui/inline-code';

/** Props for {@link SetupSteps}. */
export interface SetupStepsProps {
  /** The organization's first agent, or `null` before one exists. */
  agent: AgentSummary | null;
  /** That agent's detail, which carries its balance and policy. */
  detail: AgentDetail | null;
  /** Whether key management is reachable. False for a machine principal. */
  keysAvailable: boolean;
  /** How many live keys exist, used to name the next one sensibly. */
  liveKeys: number;
  /** Where an agent runtime connects. */
  mcpUrl: string;
  /** Base URL of the example paid resource. */
  resource: string;
  /** Resolves one step's state from the run as a whole. */
  stateOf: (position: number) => StepState;
  /** How many steps there are. */
  total: number;
}

/**
 * The seven steps, in the order they have to happen.
 *
 * @remarks Separated from the page so that one fetches and decides while this
 * one only draws. Nothing here reads state of its own.
 */
export function SetupSteps({
  agent,
  detail,
  keysAvailable,
  liveKeys,
  mcpUrl,
  resource,
  stateOf,
  total,
}: SetupStepsProps) {
  return (
    <ol className="flex flex-col">
      <Step
        index={1}
        total={total}
        icon={Bot}
        title="Register an agent"
        summary="Pocket provisions a Privy-custodied wallet and records its public key. No private key reaches Pocket, your server, or the model."
        state={stateOf(0)}
      >
        {agent === null ? (
          <AgentCreateForm />
        ) : (
          <CodeBlock
            code={agent.wallet?.address ?? 'Wallet pending'}
            label={`${agent.name} wallet address`}
            caption={`${agent.name} · ${agent.wallet?.chain ?? 'unassigned'}`}
          />
        )}
      </Step>

      <Step
        index={2}
        total={total}
        icon={Coins}
        title="Fund its wallet with USDC"
        summary="The only funding step. An agent needs the asset it spends and nothing else."
        state={stateOf(1)}
      >
        <FundStep
          address={agent?.wallet?.address ?? null}
          accountId={detail?.accountId ?? null}
          balance={detail?.balance?.amount ?? null}
          funded={stateOf(1) === 'done'}
        />
      </Step>

      <Step
        index={3}
        total={total}
        icon={Gauge}
        title="Set a daily budget"
        summary="A daily ceiling and a per-transaction ceiling. This is how much, not what for."
        state={stateOf(2)}
      >
        <ConfigureStep agentId={agent?.id ?? null} agentName={agent?.name ?? null} kind="budget" />
      </Step>

      <Step
        index={4}
        total={total}
        icon={ShieldHalf}
        title="Write a spending policy"
        summary="What it may buy, in which asset, from whom. Without one the agent is refused even with money in the wallet."
        state={stateOf(3)}
      >
        <ConfigureStep agentId={agent?.id ?? null} agentName={agent?.name ?? null} kind="policy" />
      </Step>

      <Step
        index={5}
        total={total}
        icon={KeyRound}
        title="Create an API key"
        summary="Your runtime presents this to the MCP server. It travels in a transport header, so the model never sees it and cannot leak it in a completion."
        state={stateOf(4)}
      >
        {keysAvailable ? (
          <ApiKeyMinter existing={liveKeys} />
        ) : (
          <p className="text-text-secondary text-sm leading-relaxed">
            This dashboard is running with <InlineCode>POCKET_API_KEY</InlineCode> set, so it is
            authenticated as a machine rather than a person. Sign in to manage keys.
          </p>
        )}
      </Step>

      <Step
        index={6}
        total={total}
        icon={PlugZap}
        title="Connect your agent runtime"
        summary="One command. Eight tools reach your agent: one that can spend, and seven so it does not have to guess."
        state={stateOf(5)}
      >
        <HermesConnect url={mcpUrl} />
      </Step>

      <Step
        index={7}
        total={total}
        icon={ShoppingCart}
        title="Make the first purchase"
        summary="Ask for something behind a paywall. Pocket decides before anything is signed."
        state={stateOf(6)}
        last
      >
        <FirstPurchase agentId={agent?.id ?? null} resource={resource} />
      </Step>
    </ol>
  );
}
