import { ArrowUpRight, CircleCheck, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { RecheckButton } from './recheck-button';
import { CodeBlock } from '@/components/ui/code-block';

/** Circle's faucet, the only source of testnet USDC on Hedera. */
const USDC_FAUCET = 'https://faucet.circle.com';

/** Hedera's own faucet. Hands out HBAR, which creates an account. */
const HBAR_FAUCET = 'https://portal.hedera.com/faucet';

/** Props for {@link FundStep}. */
export interface FundStepProps {
  /** The agent's wallet address, or `null` before one exists. */
  address: string | null;
  /** The wallet's Hedera account id, or `null` until the account exists. */
  accountId: string | null;
  /** Current balance as a decimal string, or `null` when unknown. */
  balance: string | null;
  /** Whether the balance is already above zero. */
  funded: boolean;
}

/**
 * Funding instructions, and the two faucets that are easy to confuse.
 *
 * @remarks Hedera's portal faucet hands out HBAR, which an agent never needs
 * to pay: the x402 facilitator covers every transaction fee, so a wallet
 * settles with a zero HBAR balance. It is here for one reason only, which the
 * copy says out loud: a faucet that insists on a `0.0.x` id cannot be used
 * until an account exists, and the cheapest way to bring one into existence is
 * to send it a little HBAR.
 */
export function FundStep({ address, accountId, balance, funded }: FundStepProps) {
  if (address === null) {
    return (
      <p className="text-text-secondary text-sm leading-relaxed">
        Register an agent first. Its address appears here once the wallet is provisioned.
      </p>
    );
  }

  if (funded) {
    return (
      <div className="border-border bg-success-soft flex gap-2.5 rounded-md border p-3">
        <CircleCheck
          aria-hidden
          className="text-success-ink mt-0.5 size-4 shrink-0"
          strokeWidth={2}
        />
        <div className="min-w-0">
          <p className="text-success-ink text-sm font-medium">
            Funded with {balance ?? 'some'} USDC.
          </p>
          <p className="text-text-secondary mt-1 text-sm leading-relaxed">
            The demo resource costs 0.01 USDC a call. Next: give it a budget and a policy, because
            money without permission still buys nothing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CodeBlock code={address} label="Agent wallet address" caption="EVM address, for a wallet" />
      {accountId === null ? null : (
        <CodeBlock
          code={accountId}
          label="Agent Hedera account id"
          caption="Hedera account id, for a faucet"
        />
      )}

      <div className="border-border bg-ash-50 flex gap-2.5 rounded-md border p-3">
        <Info aria-hidden className="text-accent-600 mt-0.5 size-4 shrink-0" strokeWidth={2} />
        <div className="min-w-0">
          <p className="text-text text-sm font-medium">USDC only. HBAR is not needed to pay.</p>
          <p className="text-text-secondary mt-1 text-sm leading-relaxed">
            The x402 facilitator pays every transaction fee, so an agent settles with a zero HBAR
            balance. USDC arriving also creates the Hedera account, and the first payment publishes
            its key, so there is nothing else to set up.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" asChild>
          <a href={USDC_FAUCET} target="_blank" rel="noreferrer noopener">
            Get testnet USDC
            <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
          </a>
        </Button>
        <Button variant="ghost" asChild>
          <a href={HBAR_FAUCET} target="_blank" rel="noreferrer noopener">
            HBAR faucet
            <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
          </a>
        </Button>
        <RecheckButton label="I have sent it" />
      </div>

      <p className="text-text-muted text-xs leading-relaxed">
        {balance === null
          ? 'The balance could not be read just now.'
          : `Balance reads ${balance} USDC.`}{' '}
        This step completes on its own once the transfer confirms; nothing here is ticked by hand.
      </p>

      <p className="text-text-muted text-xs leading-relaxed">
        Circle gives 20 USDC every two hours per address. Choose{' '}
        <strong className="text-text-secondary font-medium">Hedera Testnet</strong> in its network
        list.{' '}
        {accountId === null
          ? 'If it refuses the address above and asks for a 0.0.x id, this wallet has no Hedera account yet. Send it a little HBAR from the second faucet, reload this page, and the id will appear here.'
          : 'Paste whichever of the two it accepts.'}
      </p>
    </>
  );
}
