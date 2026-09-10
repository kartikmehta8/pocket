import { ArrowUpRight, CircleCheck, Info } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { RecheckButton } from './recheck-button';
import { CodeBlock } from '@/components/ui/code-block';

/** Circle's faucet, the only source of testnet USDC on Hedera. */
const USDC_FAUCET = 'https://faucet.circle.com';

/** Hedera's own faucet. Hands out HBAR, which is what creates an account. */
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

/** One half of the funding sequence, drawn as a numbered marker and a line. */
function Stage({ n, label, state }: { n: number; label: string; state: 'now' | 'next' | 'done' }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-semibold',
          state === 'now' && 'border-accent-300 bg-accent-100 text-accent-700',
          state === 'next' && 'border-border bg-surface text-text-muted',
          state === 'done' && 'border-success-line bg-success-soft text-success-ink',
        )}
      >
        {n}
      </span>
      <span
        className={cn(
          'truncate text-sm',
          state === 'now' ? 'text-text font-semibold' : 'text-text-muted font-medium',
        )}
      >
        {label}
        <span className="sr-only">
          {state === 'done' ? ' — done' : state === 'now' ? ' — do this now' : ' — after that'}
        </span>
      </span>
    </div>
  );
}

/**
 * Funding instructions, in the order they actually have to happen.
 *
 * @remarks This step trips people up, and the reason is a chicken and egg.
 * Circle's faucet asks for a Hedera `0.0.x` account id, but a freshly
 * provisioned wallet is only an EVM address: it has no account, and therefore
 * no id, until something is sent to it. The cheapest way to bring one into
 * existence is a little HBAR from Hedera's own faucet. So the sequence is HBAR
 * first, then USDC, and the copy leads with whichever half is outstanding
 * rather than presenting two faucets and leaving the order to be guessed.
 *
 * The HBAR is not spending money. Once the account exists the x402 facilitator
 * pays every transaction fee, and the wallet settles with a zero HBAR balance.
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

  const hasAccount = accountId !== null;

  return (
    <>
      <div className="border-border bg-ash-50 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2.5">
        <Stage n={1} label="HBAR, to create the account" state={hasAccount ? 'done' : 'now'} />
        <span aria-hidden className="bg-ash-300 hidden h-px w-4 shrink-0 sm:block" />
        <Stage n={2} label="USDC, to spend" state={hasAccount ? 'now' : 'next'} />
      </div>

      <div
        className={cn(
          'bg-accent-50 flex gap-2.5 rounded-md border p-3',
          hasAccount ? 'border-border' : 'border-accent-200',
        )}
      >
        <Info aria-hidden className="text-accent-600 mt-0.5 size-4 shrink-0" strokeWidth={2} />
        <div className="min-w-0">
          <p className="text-text text-sm font-semibold">
            {hasAccount ? 'Now send USDC to the account id below.' : 'Send HBAR first.'}
          </p>
          <p className="text-text-secondary mt-1 text-sm leading-relaxed">
            {hasAccount
              ? 'Circle asks for a 0.0.x id, and this wallet now has one. USDC is the only asset the agent ever spends.'
              : 'This wallet has no Hedera account yet, so it has no 0.0.x id — and Circle’s faucet asks for one. A little HBAR from Hedera’s faucet creates the account, and the id appears here on reload.'}
          </p>
          <p className="text-text-muted mt-1.5 text-xs leading-relaxed">
            HBAR is not what the agent spends. It is needed once, to bring the account into
            existence. After that the x402 facilitator pays every transaction fee, so the wallet
            settles with a zero HBAR balance.
          </p>
        </div>
      </div>

      <CodeBlock code={address} label="Agent wallet address" caption="EVM address, for a wallet" />
      {accountId === null ? null : (
        <CodeBlock
          code={accountId}
          label="Agent Hedera account id"
          caption="Hedera account id, for Circle’s faucet"
        />
      )}

      {/* The outstanding half is the primary button. Two equally weighted
          faucets is what sent people to the wrong one in the first place. */}
      <div className="flex flex-wrap items-center gap-2">
        {hasAccount ? (
          <>
            <Button variant="primary" asChild>
              <a href={USDC_FAUCET} target="_blank" rel="noreferrer noopener">
                Get testnet USDC
                <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
            <Button variant="ghost" asChild>
              <a href={HBAR_FAUCET} target="_blank" rel="noreferrer noopener">
                HBAR faucet
                <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" asChild>
              <a href={HBAR_FAUCET} target="_blank" rel="noreferrer noopener">
                Get testnet HBAR
                <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
            <Button variant="ghost" asChild>
              <a href={USDC_FAUCET} target="_blank" rel="noreferrer noopener">
                Circle faucet
                <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          </>
        )}
        <RecheckButton label="I have sent it" />
      </div>

      <p className="text-text-muted text-xs leading-relaxed">
        {balance === null
          ? 'The balance could not be read just now.'
          : `Balance reads ${balance} USDC.`}{' '}
        This step completes on its own once the transfer confirms; nothing here is ticked by hand.
        Circle gives 20 USDC every two hours per address — choose{' '}
        <strong className="text-text-secondary font-medium">Hedera Testnet</strong> in its network
        list.
      </p>
    </>
  );
}
