'use client';

import { Receipt } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ExpandButton } from '@/components/ui/expand-button';
import { Table, TableFrame, TBody, TD, TH, THead } from '@/components/ui/table';
import { categoryLabel } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { formatAmount, formatDateTime, truncateAddress } from '@/lib/format';
import { paymentStatusPresentation } from '@/lib/status';
import type { Payment } from '@/lib/types';

import { PaymentDetail } from './payment-detail';

/** Whether money was stopped or lost, which earns the row a tint. */
function isRefusal(payment: Payment): boolean {
  return payment.status === 'blocked' || payment.status === 'failed';
}

/** What one payment needs to render, whichever shape it takes. */
interface RowProps {
  payment: Payment;
  showAgent: boolean;
  open: boolean;
  onToggle: () => void;
}

/**
 * The expanded body, opened and closed by a CSS grid transition.
 *
 * @remarks Always in the DOM, sized to nothing while closed. A JavaScript
 * height animation inside a table row re-laid the table on every frame and
 * visibly stuttered; a grid row going from `0fr` to `1fr` is one transition
 * the browser runs on its own. `inert` keeps the closed body out of the tab
 * order and away from a screen reader.
 */
function Detail({ payment, open }: { payment: Payment; open: boolean }) {
  return (
    <div data-open={open} inert={!open} className="collapse-panel">
      <div>
        <PaymentDetail payment={payment} />
      </div>
    </div>
  );
}

/**
 * One payment at phone width: stacked, wrapping, with nothing to scroll
 * sideways for. The detail opens beneath at full width.
 */
function PaymentCard({ payment, showAgent, open, onToggle }: RowProps) {
  const status = paymentStatusPresentation(payment.status);
  return (
    <li
      className={cn(
        '[&+li]:border-divider [&+li]:border-t',
        isRefusal(payment) ? 'bg-danger-soft/50' : 'bg-surface',
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone={status.tone} icon={status.Icon} hint={status.hint}>
              {status.label}
            </Badge>
            <span className="figures text-text text-sm font-medium">
              {formatAmount(payment.amount, payment.asset)}
            </span>
          </div>
          <p className="text-text-secondary text-sm leading-snug break-words">{payment.reason}</p>
          <p className="text-text-muted flex flex-wrap items-center gap-x-2 text-xs">
            <time dateTime={payment.createdAt}>{formatDateTime(payment.createdAt)}</time>
            {showAgent ? (
              <>
                <span aria-hidden>·</span>
                <Link
                  href={`/agents/${payment.agentId}`}
                  className="text-text hover:text-accent-700 rounded-sm font-medium"
                >
                  {payment.agentName}
                </Link>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span>{categoryLabel(payment.category)}</span>
            {payment.denialCode ? (
              <>
                <span aria-hidden>·</span>
                <code className="text-danger-ink font-mono">{payment.denialCode}</code>
              </>
            ) : null}
          </p>
        </div>
        <ExpandButton open={open} subject={`payment ${payment.id}`} onClick={onToggle} />
      </div>
      <Detail payment={payment} open={open} />
    </li>
  );
}

/**
 * One payment as a table row, with its detail in a row of its own beneath it
 * while open.
 *
 * @remarks Dividers are top borders, so the last row never doubles up with
 * whatever follows the table, and an open detail sits flush under its row.
 */
function PaymentRow({ payment, showAgent, open, onToggle }: RowProps) {
  const status = paymentStatusPresentation(payment.status);
  const columns = showAgent ? 7 : 6;
  return (
    <>
      <tr
        className={cn(
          '[&>td]:border-divider [&:last-child>td]:border-b-0 [&>td]:border-b',
          'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
          isRefusal(payment) ? 'bg-danger-soft/50 hover:bg-danger-soft' : 'hover:bg-ash-25',
        )}
      >
        <TD className="text-text-secondary whitespace-nowrap">
          <time dateTime={payment.createdAt}>{formatDateTime(payment.createdAt)}</time>
        </TD>
        {showAgent ? (
          <TD>
            <Link
              href={`/agents/${payment.agentId}`}
              className="text-text hover:text-accent-700 rounded-sm font-medium whitespace-nowrap"
            >
              {payment.agentName}
            </Link>
          </TD>
        ) : null}
        <TD numeric className="font-medium whitespace-nowrap">
          {formatAmount(payment.amount, payment.asset)}
        </TD>
        <TD className="text-text-secondary">{categoryLabel(payment.category)}</TD>
        <TD className="text-text-secondary font-mono text-xs">
          {truncateAddress(payment.recipient)}
        </TD>
        <TD>
          <span className="flex items-center gap-2">
            <Badge tone={status.tone} icon={status.Icon} hint={status.hint}>
              {status.label}
            </Badge>
            {payment.denialCode ? (
              <code className="text-2xs text-danger-ink font-mono">{payment.denialCode}</code>
            ) : null}
          </span>
        </TD>
        <TD numeric>
          <ExpandButton open={open} subject={`payment ${payment.id}`} onClick={onToggle} />
        </TD>
      </tr>
      <tr>
        <td colSpan={columns} className="p-0">
          {/* Zero width, full minimum: the detail fills the row without its
              content ever counting toward the table's width. */}
          <div className="w-0 min-w-full">
            <Detail payment={payment} open={open} />
          </div>
        </td>
      </tr>
    </>
  );
}

/** Props for {@link PaymentsTable}. */
export interface PaymentsTableProps {
  payments: Payment[];
  /** Show the agent column — off on an agent's own detail page. */
  showAgent?: boolean;
  /** Message shown when the list is empty. */
  emptyTitle?: string;
}

/**
 * Payment history, one entry per attempt, with the reason, resource and
 * denial code behind a disclosure.
 *
 * @remarks One entry open at a time. Blocked and failed payments carry a
 * tinted row, so they can be found without reading every badge. Below the
 * `md` breakpoint the same payments render as stacked cards rather than a
 * seven-column table scrolled sideways.
 */
export function PaymentsTable({
  payments,
  showAgent = true,
  emptyTitle = 'No payments yet',
}: PaymentsTableProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title={emptyTitle}
        description="Payments appear here as soon as an agent attempts one."
      />
    );
  }

  const rowProps = (payment: Payment): RowProps => ({
    payment,
    showAgent,
    open: openId === payment.id,
    onToggle: () => setOpenId(openId === payment.id ? null : payment.id),
  });

  return (
    <>
      <ul className="md:hidden">
        {payments.map((payment) => (
          <PaymentCard key={payment.id} {...rowProps(payment)} />
        ))}
      </ul>

      <TableFrame className="hidden md:block">
        <Table>
          <THead>
            <TH>When</TH>
            {showAgent ? <TH>Agent</TH> : null}
            <TH numeric>Amount</TH>
            <TH>Category</TH>
            <TH>Recipient</TH>
            <TH>Status</TH>
            <TH className="sr-only">Expand</TH>
          </THead>
          <TBody>
            {payments.map((payment) => (
              <PaymentRow key={payment.id} {...rowProps(payment)} />
            ))}
          </TBody>
        </Table>
      </TableFrame>
    </>
  );
}
