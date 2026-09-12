/**
 * The funding panel: the addresses a faucet asks for, and the faucets.
 */

import { ActivateButton } from '@/components/setup/activate-button';
import { CodeBlock } from '@/components/ui/code-block';

import { FaucetLink } from './faucet-menu';

/** Props for {@link TopUp}. */
export interface TopUpProps {
  /** The wallet's Hedera account id, or `null` until the account exists. */
  accountId: string | null;
  /** Whether that account exists but has never published its key. */
  hollow: boolean;
  /** The agent the account belongs to. */
  agentId: string;
}

/**
 * Adding more testnet funds, for anyone who wants to keep going.
 *
 * @remarks Both faucets are always offered. Which one is useful depends on
 * where the wallet has got to, so the copy leads with that — but neither is
 * ever withheld, because an operator who wants to stock a wallet before they
 * need to should not have to reach a particular state first to be shown the
 * link.
 *
 * Circle's has two traps worth naming rather than discovering: it asks for a
 * `0.0.x` id rather than an address, and it will not send to an account that
 * has never signed anything. It reports success either way, so an operator who
 * hits either one is left watching for money that is not coming.
 *
 * Publishing the key has a trap of its own. It is a signed transaction, so the
 * wallet pays gas for it — and a wallet Pocket seeded holds USDC and nothing
 * else. The HBAR faucet leads while that is outstanding.
 */
export function TopUp({ accountId, hollow, agentId }: TopUpProps) {
  const usable = accountId !== null && !hollow;

  return (
    <div className="flex flex-col gap-2.5">
      {accountId === null ? (
        <p className="text-text-muted text-xs leading-relaxed">
          Circle asks for a Hedera{' '}
          <strong className="text-text-secondary font-medium">0.0.x</strong> id and this wallet has
          no account yet. A little HBAR brings one into existence, and the id appears here.
        </p>
      ) : null}

      {hollow ? (
        <>
          <p className="text-text-muted text-xs leading-relaxed">
            The account exists but has never signed anything, so it has published no key — and
            Circle will not send to one of those, silently. One signature fixes it for good.
          </p>
          <p className="text-text-muted text-xs leading-relaxed">
            That signature is a transaction, so the wallet needs a little HBAR to pay for it. Take
            some from the Hedera faucet below first. The agent still never spends HBAR — this is
            only what publishes the key.
          </p>
          <ActivateButton agentId={agentId} />
        </>
      ) : null}

      {usable ? (
        <CodeBlock
          code={accountId}
          label="Agent Hedera account id"
          caption="Hedera account id, for Circle’s faucet"
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <FaucetLink asset="USDC" />
        <FaucetLink asset="HBAR" />
      </div>

      <p className="text-text-muted text-xs leading-relaxed">
        On Circle, choose{' '}
        <strong className="text-text-secondary font-medium">Hedera Testnet</strong> and paste the{' '}
        <strong className="text-text-secondary font-medium">0.0.x</strong> id rather than the
        address. HBAR is never spent by the agent: the x402 facilitator pays every transaction fee.
      </p>
    </div>
  );
}
