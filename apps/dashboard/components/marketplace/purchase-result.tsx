'use client';

import { ArrowUpRight, Ban, CircleCheck, Clock, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';

import { cn } from '@/lib/cn';
import { DURATION, EASE } from '@/lib/motion';
import type { PurchaseOutcome } from '@/lib/types';
import { CodeBlock } from '@/components/ui/code-block';

/** Chrome for each outcome: icon, tone classes, and what to call it. */
function chrome(outcome: PurchaseOutcome) {
  switch (outcome.status) {
    case 'paid':
      return { Icon: CircleCheck, title: 'Paid and delivered', tone: 'success' as const };
    case 'free':
      return { Icon: CircleCheck, title: 'Served without charge', tone: 'success' as const };
    case 'blocked':
      return outcome.payment.status === 'awaiting_approval'
        ? { Icon: Clock, title: 'Held for approval', tone: 'warning' as const }
        : { Icon: Ban, title: 'Refused by policy', tone: 'danger' as const };
    case 'replayed':
      return { Icon: CircleCheck, title: 'Already paid', tone: 'success' as const };
    case 'failed':
      return { Icon: TriangleAlert, title: 'Purchase failed', tone: 'danger' as const };
  }
}

const SHELL = {
  success: 'border-border bg-success-soft',
  warning: 'border-border bg-warning-soft',
  danger: 'border-border bg-danger-soft',
};

const INK = {
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
};

/** The data a purchase returned, or the reason it did not happen. */
function Body({ outcome }: { outcome: PurchaseOutcome }) {
  if (outcome.status === 'paid' || outcome.status === 'free') {
    return (
      <CodeBlock
        className="bg-surface mt-2.5 max-h-72 overflow-y-auto"
        label="Purchased data"
        caption="Response"
        code={JSON.stringify(outcome.result, null, 2)}
      />
    );
  }

  if (outcome.status === 'blocked') {
    return (
      <ul className="mt-2 flex flex-col gap-1">
        {outcome.decision.violations.map((violation) => (
          <li key={violation.code} className="text-danger-ink/90 text-xs leading-relaxed">
            <span className="font-mono font-medium">{violation.code}</span>: {violation.message}
          </li>
        ))}
        {outcome.decision.approvalReasons.map((reason) => (
          <li key={reason} className="text-warning-ink/90 text-xs leading-relaxed">
            {reason}
          </li>
        ))}
      </ul>
    );
  }

  if (outcome.status === 'replayed') {
    return (
      <p className="text-success-ink/90 mt-1 text-xs leading-relaxed">
        This attempt had already gone through, so it was charged once rather than twice. The
        seller&rsquo;s response is not kept, so buy it again to fetch fresh data.
      </p>
    );
  }

  // A settlement failure is usually about the wallet, which is two clicks away
  // on a page the reader may not think to look for. The payment is absent when
  // the attempt failed before a row existed, and then there is nothing to
  // point at.
  const payment = outcome.payment;
  return (
    <div className="mt-1 flex flex-col gap-2">
      <p className="text-danger-ink/90 text-xs leading-relaxed">{outcome.message}</p>
      {payment === undefined ? null : (
        <Link
          href={`/agents/${payment.agentId}`}
          className="text-danger-ink inline-flex w-fit items-center gap-1 text-xs font-medium underline decoration-dotted underline-offset-4"
        >
          Open {payment.agentName}
          <ArrowUpRight aria-hidden className="size-3" strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}

/**
 * What a purchase attempt produced.
 *
 * A refusal gets the same weight as a success: the reason is on screen, in
 * full, because "why was my agent stopped?" is the question this product
 * exists to answer.
 *
 * @param outcome The purchase result, or `null` before anything is bought.
 * @param revision Counter that forces a re-animation on a repeated purchase.
 */
export function PurchaseResult({
  outcome,
  revision,
}: {
  outcome: PurchaseOutcome | null;
  revision: number;
}) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence initial={false} mode="wait">
      {outcome === null ? null : (
        <motion.div
          key={revision}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.base, ease: EASE }}
        >
          {(() => {
            const { Icon, title, tone } = chrome(outcome);
            const explorerUrl =
              outcome.status === 'paid' || outcome.status === 'replayed'
                ? outcome.payment.explorerUrl
                : null;
            return (
              <div className={cn('rounded-md border p-3', SHELL[tone])}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={cn('flex items-center gap-1.5 text-sm font-medium', INK[tone])}>
                    <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
                    {title}
                  </p>
                  {explorerUrl ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-success-ink inline-flex items-center gap-1 text-xs font-medium hover:underline"
                    >
                      View on HashScan
                      <ArrowUpRight aria-hidden className="size-3" strokeWidth={2.25} />
                    </a>
                  ) : null}
                </div>
                <Body outcome={outcome} />
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
