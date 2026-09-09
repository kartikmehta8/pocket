'use client';

import { ChevronRight, Receipt } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { Fragment, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableFrame, TBody, TD, TH, THead } from '@/components/ui/table';
import { categoryLabel } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { formatAmount, formatDateTime, truncateAddress } from '@/lib/format';
import { DURATION, EASE } from '@/lib/motion';
import { paymentStatusPresentation } from '@/lib/status';
import type { Payment } from '@/lib/types';

import { PaymentDetail } from './payment-detail';

/** Props for {@link PaymentsTable}. */
export interface PaymentsTableProps {
  payments: Payment[];
  /** Show the agent column — off on an agent's own detail page. */
  showAgent?: boolean;
  /** Message shown when the list is empty. */
  emptyTitle?: string;
}

/**
 * Payment history with expandable rows. Blocked payments carry a danger rule
 * and a tinted row so they are distinguishable without reading the badge, and
 * rows animate their position when the surrounding list is filtered.
 */
export function PaymentsTable({
  payments,
  showAgent = true,
  emptyTitle = 'No payments yet',
}: PaymentsTableProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const columnCount = showAgent ? 7 : 6;

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title={emptyTitle}
        description="Payments appear here as soon as an agent attempts one."
      />
    );
  }

  return (
    <TableFrame>
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
          {payments.map((payment) => {
            const open = openId === payment.id;
            const status = paymentStatusPresentation(payment.status);
            const blocked = payment.status === 'blocked' || payment.status === 'failed';
            return (
              <Fragment key={payment.id}>
                <motion.tr
                  layout={reduced ? false : 'position'}
                  transition={{ duration: DURATION.base, ease: EASE }}
                  className={cn(
                    'border-divider border-b transition-colors duration-(--duration-fast) ease-(--ease-brand)',
                    blocked ? 'bg-danger-soft/50 hover:bg-danger-soft' : 'hover:bg-ash-25',
                  )}
                >
                  <TD className="text-text-secondary whitespace-nowrap">
                    {formatDateTime(payment.createdAt)}
                  </TD>
                  {showAgent ? (
                    <TD>
                      <Link
                        href={`/agents/${payment.agentId}`}
                        className="text-text hover:text-accent-700 rounded-sm font-medium"
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
                        <code className="text-2xs text-danger-ink font-mono">
                          {payment.denialCode}
                        </code>
                      ) : null}
                    </span>
                  </TD>
                  <TD numeric>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : payment.id)}
                      aria-expanded={open}
                      aria-label={`${open ? 'Collapse' : 'Expand'} payment ${payment.id}`}
                      className="text-ash-400 hover:bg-ash-100 hover:text-text inline-flex size-6 cursor-pointer items-center justify-center rounded-sm"
                    >
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          'size-4 transition-transform duration-(--duration-fast) ease-(--ease-brand)',
                          open && 'rotate-90',
                        )}
                        strokeWidth={2}
                      />
                    </button>
                  </TD>
                </motion.tr>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.tr
                      key={`${payment.id}-detail`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: DURATION.fast, ease: EASE }}
                      className="border-divider border-b"
                    >
                      <td colSpan={columnCount} className="p-0">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          transition={{ duration: DURATION.base, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <PaymentDetail payment={payment} />
                        </motion.div>
                      </td>
                    </motion.tr>
                  ) : null}
                </AnimatePresence>
              </Fragment>
            );
          })}
        </TBody>
      </Table>
    </TableFrame>
  );
}
