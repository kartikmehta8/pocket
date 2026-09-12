import { CircleCheck, Info } from 'lucide-react';

import { FundingStages } from './funding-stages';
import { TopUp } from '@/components/wallet/top-up';
import { RecheckButton } from './recheck-button';
import { CodeBlock } from '@/components/ui/code-block';

/** Props for {@link FundStep}. */
export interface FundStepProps {
  /** The agent's wallet address, or `null` before one exists. */
  address: string | null;
  /** The wallet's Hedera account id, or `null` until the account exists. */
  accountId: string | null;
  /** Whether that account exists but has never published its key. */
  accountHollow: boolean | null;
  /** The agent the account belongs to, or `null` before one exists. */
  agentId: string | null;
  /** Current balance as a decimal string, or `null` when unknown. */
  balance: string | null;
  /** Whether the balance is already above zero. */
  funded: boolean;
}

/**
 * What the agent has to spend, and how to add more.
 *
 * @remarks Ordinarily nothing to do. Pocket seeds a new agent from its own
 * treasury, and that transfer is also what brings the Hedera account into
 * existence and associates the token — so a seeded agent can pay immediately,
 * on a zero HBAR balance, because the x402 facilitator covers every fee.
 *
 * The step used to send people to Circle's faucet, which rate-limits, refuses
 * accounts that have never signed anything, and reports success either way.
 * That is now an optional path for testing at length rather than the only way
 * to begin, and the traps are named rather than left to be discovered.
 */
export function FundStep({
  address,
  accountId,
  accountHollow,
  agentId,
  balance,
  funded,
}: FundStepProps) {
  if (address === null) {
    return (
      <p className="text-text-secondary text-sm leading-relaxed">
        Register an agent first. Its address appears here once the wallet is provisioned.
      </p>
    );
  }

  const hollow = accountHollow === true;

  if (funded) {
    return (
      <>
        <div className="border-border bg-success-soft flex gap-2.5 rounded-md border p-3">
          <CircleCheck
            aria-hidden
            className="text-success-ink mt-0.5 size-4 shrink-0"
            strokeWidth={2}
          />
          <div className="min-w-0">
            <p className="text-success-ink text-sm font-medium">
              Ready to spend, with {balance ?? 'some'} USDC.
            </p>
            <p className="text-text-secondary mt-1 text-sm leading-relaxed">
              Pocket funded this wallet when you registered the agent, so there is nothing to do
              here. The demo resource costs 0.01 USDC a call, and the facilitator pays every
              transaction fee, so the agent needs no HBAR of its own.
            </p>
            <p className="text-text-secondary mt-1.5 text-sm leading-relaxed">
              Next: give it a budget and a policy, because money without permission still buys
              nothing.
            </p>
          </div>
        </div>

        {agentId === null ? null : (
          <details className="group">
            <summary className="text-text-secondary hover:text-text focus-visible:ring-accent-300 cursor-pointer list-none text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
              Adding more is optional
              <span className="text-text-muted ml-1.5 font-normal">
                — for testing beyond a few calls
              </span>
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              <TopUp accountId={accountId} hollow={hollow} agentId={agentId} />
            </div>
          </details>
        )}
      </>
    );
  }

  // Ordinarily unreachable: an agent is funded at registration. This is the
  // wallet that missed it — no treasury configured, or an empty one — and the
  // guide still has to work, so the faucet route stays. Deliberately says
  // nothing about treasuries: why Pocket did not pay is Pocket's problem, and
  // the only useful thing to tell an operator is how to carry on.
  return (
    <>
      <FundingStages hasAccount={accountId !== null} hollow={hollow} />

      <div className="border-accent-200 bg-accent-50 flex gap-2.5 rounded-md border p-3">
        <Info aria-hidden className="text-accent-600 mt-0.5 size-4 shrink-0" strokeWidth={2} />
        <div className="min-w-0">
          <p className="text-text text-sm font-semibold">Add some USDC to get started.</p>
          <p className="text-text-secondary mt-1 text-sm leading-relaxed">
            This wallet has nothing in it yet. Send it USDC from the faucet below and the step ticks
            itself, or publish the key first if the faucet asks for an account id it will accept.
          </p>
          <p className="text-text-muted mt-1.5 text-xs leading-relaxed">
            USDC is the only asset the agent spends — the x402 facilitator pays every transaction
            fee, so it never needs HBAR of its own.
          </p>
        </div>
      </div>

      <CodeBlock code={address} label="Agent wallet address" caption="EVM address, for a wallet" />

      {agentId === null ? null : <TopUp accountId={accountId} hollow={hollow} agentId={agentId} />}

      <div className="flex flex-wrap items-center gap-2">
        <RecheckButton label="I have sent it" />
        <span className="text-text-muted text-xs">
          {balance === null
            ? 'The balance could not be read just now.'
            : `Balance reads ${balance} USDC.`}{' '}
          This step ticks itself once a transfer confirms.
        </span>
      </div>
    </>
  );
}
