import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { Fact } from '@/components/ui/fact';
import { categoryLabel } from '@/lib/catalog';
import { formatDateTime, humanize, truncateAddress } from '@/lib/format';
import type { Payment } from '@/lib/types';

import { PaymentApproval } from './payment-approval';

/** A hash or address: shortened, exact on hover, copied in full. */
function Mono({ value, label }: { value: string; label: string }) {
  return (
    <span className="figures inline-flex min-w-0 items-center gap-1 font-mono text-xs">
      <span title={value}>{truncateAddress(value, 10, 8)}</span>
      <CopyButton value={value} label={label} />
    </span>
  );
}

/** The placeholder for a field this payment does not have. */
function None({ children = 'None' }: { children?: ReactNode }) {
  return <span className="text-text-muted">{children}</span>;
}

/** An address that opens in a new tab, shown without its scheme. */
function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-accent-700 inline-flex max-w-full items-baseline gap-1 underline underline-offset-2"
    >
      <span className="min-w-0">{children}</span>
      <ExternalLink aria-hidden className="size-3 shrink-0 self-center" strokeWidth={2} />
    </a>
  );
}

/**
 * Expanded body of a payment row: who asked, what it bought, where the money
 * went, the rule that stopped it, and the transaction once it is on chain.
 *
 * @remarks Laid out as two short key/value tables side by side, one row per
 * fact, rather than a grid of labelled cells: a reader scans down a column of
 * labels faster than across a grid, and a long value only ever lengthens its
 * own row.
 */
export function PaymentDetail({ payment }: { payment: Payment }) {
  return (
    <div className="bg-ash-25 flex flex-col gap-3 px-4 py-4">
      <div className="text-text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          Payment
          <span className="figures text-text-secondary font-mono">{payment.id}</span>
          <CopyButton value={payment.id} label="payment id" />
        </span>
        <span>Initiated by {humanize(payment.initiatedBy).toLowerCase()}</span>
        <span>
          {payment.settledAt ? (
            <>
              Settled{' '}
              <time dateTime={payment.settledAt} className="figures">
                {formatDateTime(payment.settledAt)}
              </time>
            </>
          ) : (
            'Not settled'
          )}
        </span>
      </div>

      <div className="grid gap-x-8 md:grid-cols-2">
        <dl className="divide-divider divide-y">
          <Fact label="Reason">{payment.reason}</Fact>
          <Fact label="Resource">
            {payment.resource ? (
              <External href={payment.resource}>
                {payment.resource.replace(/^https?:\/\//, '')}
              </External>
            ) : (
              <None />
            )}
          </Fact>
          <Fact label="Recipient">
            <Mono value={payment.recipient} label="recipient address" />
          </Fact>
          <Fact label="Network">{humanize(payment.chain)}</Fact>
        </dl>
        {/* The divider the first list ends on continues here at phone width,
            where the two lists stack into one. */}
        <dl className="divide-divider border-divider divide-y border-t md:border-t-0">
          <Fact label="Category">{categoryLabel(payment.category)}</Fact>
          <Fact label="Task budget">
            {payment.taskBudgetId ? (
              <span className="figures font-mono text-xs">{payment.taskBudgetId}</span>
            ) : (
              <None />
            )}
          </Fact>
          <Fact label="Transaction">
            {payment.txHash ? (
              <span className="inline-flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <Mono value={payment.txHash} label="transaction hash" />
                {payment.explorerUrl ? (
                  <External href={payment.explorerUrl}>HashScan</External>
                ) : null}
              </span>
            ) : (
              <None>None yet</None>
            )}
          </Fact>
          <Fact label="Refused">
            {payment.denialCode ? (
              <Badge tone="danger">
                <span className="font-mono">{payment.denialCode}</span>
              </Badge>
            ) : (
              <None>No</None>
            )}
          </Fact>
        </dl>
      </div>

      {payment.status === 'awaiting_approval' ? (
        <div className="border-divider border-t pt-3">
          <PaymentApproval paymentId={payment.id} />
        </div>
      ) : null}
    </div>
  );
}
