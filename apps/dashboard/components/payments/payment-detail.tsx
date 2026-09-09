import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { categoryLabel } from '@/lib/catalog';
import { formatDateTime, humanize, truncateAddress } from '@/lib/format';
import type { Payment } from '@/lib/types';

import { PaymentApproval } from './payment-approval';

/** One label/value pair in the expanded payment panel. */
function Entry({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-text mt-0.5 text-sm break-words">{children}</dd>
    </div>
  );
}

/**
 * Expanded body of a payment row: why the payment happened, what it bought,
 * the denial code when it was refused, and an explorer link once it is on
 * chain.
 */
export function PaymentDetail({ payment }: { payment: Payment }) {
  return (
    <dl className="bg-ash-25 grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
      <Entry label="Reason">{payment.reason}</Entry>
      <Entry label="Resource">
        {payment.resource ? (
          <a
            href={payment.resource}
            target="_blank"
            rel="noreferrer"
            className="text-accent-700 inline-flex items-center gap-1 underline underline-offset-2"
          >
            {payment.resource}
            <ExternalLink aria-hidden className="size-3 shrink-0" strokeWidth={2} />
          </a>
        ) : (
          <span className="text-text-muted">None</span>
        )}
      </Entry>
      <Entry label="Category">{categoryLabel(payment.category)}</Entry>
      <Entry label="Denial code">
        {payment.denialCode ? (
          <Badge tone="danger">
            <span className="font-mono">{payment.denialCode}</span>
          </Badge>
        ) : (
          <span className="text-text-muted">None</span>
        )}
      </Entry>
      <Entry label="Recipient">
        <span className="figures inline-flex items-center gap-1 font-mono text-xs">
          {truncateAddress(payment.recipient, 10, 8)}
          <CopyButton value={payment.recipient} label="recipient address" />
        </span>
      </Entry>
      <Entry label="Initiated by">{humanize(payment.initiatedBy)}</Entry>
      <Entry label="Task budget">
        {payment.taskBudgetId ? (
          <span className="font-mono text-xs">{payment.taskBudgetId}</span>
        ) : (
          <span className="text-text-muted">None</span>
        )}
      </Entry>
      <Entry label="Settled">
        {payment.settledAt ? (
          <span className="figures">{formatDateTime(payment.settledAt)}</span>
        ) : (
          <span className="text-text-muted">Not yet</span>
        )}
      </Entry>
      {payment.txHash ? (
        <Entry label="Transaction">
          <span className="inline-flex items-center gap-2">
            <span className="figures font-mono text-xs">
              {truncateAddress(payment.txHash, 10, 8)}
            </span>
            {payment.explorerUrl ? (
              <a
                href={payment.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent-700 inline-flex items-center gap-1 text-xs underline underline-offset-2"
              >
                HashScan
                <ExternalLink aria-hidden className="size-3" strokeWidth={2} />
              </a>
            ) : null}
          </span>
        </Entry>
      ) : null}
      {payment.status === 'awaiting_approval' ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <PaymentApproval paymentId={payment.id} />
        </div>
      ) : null}
    </dl>
  );
}
