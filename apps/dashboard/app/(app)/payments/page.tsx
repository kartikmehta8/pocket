import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PaymentsBrowser } from '@/components/payments/payments-browser';
import { ApiErrorState } from '@/components/ui/api-error';
import { PageHeader } from '@/components/ui/page-header';
import { readParam, type SearchParams } from '@/lib/search-params';
import { listAgents, listPayments } from '@/lib/api';
import { PAYMENT_STATUSES } from '@/lib/catalog';
import type { PaymentStatus } from '@/lib/types';

/** Payment history is read live on every request. */
export const dynamic = 'force-dynamic';

/** Tab title for the payments index. */
export const metadata: Metadata = { title: 'Payments' };

/** How many payments one page of the table holds. */
const PAGE_LIMIT = 30;

/** Narrow a raw query value to a contract payment status. */
function readStatus(value: string): PaymentStatus | undefined {
  return PAYMENT_STATUSES.find((status) => status === value);
}

/**
 * Payments index: filterable, expandable payment history for the whole org.
 *
 * @remarks Filters and the cursor live in the URL, so any view can be shared
 * and the browser's back button walks the pages. An unknown status in a stale
 * link is ignored rather than forwarded.
 */
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const agentId = readParam(params['agentId']);
  const status = readStatus(readParam(params['status']));
  const cursor = readParam(params['cursor']);

  const [paymentsResult, agentsResult] = await Promise.all([
    listPayments({
      limit: PAGE_LIMIT,
      ...(agentId === '' ? {} : { agentId }),
      ...(status ? { status } : {}),
      ...(cursor === '' ? {} : { cursor }),
    }),
    listAgents(),
  ]);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment attempt, including the ones policy stopped. Expand a row for its reason, resource and denial code."
      />
      {!paymentsResult.ok ? (
        <ApiErrorState
          subject="payments"
          code={paymentsResult.code}
          message={paymentsResult.message}
        />
      ) : (
        <Suspense fallback={null}>
          <PaymentsBrowser
            payments={paymentsResult.data.payments}
            agents={agentsResult.ok ? agentsResult.data.agents : []}
            agentId={agentId}
            status={status ?? ''}
            nextCursor={paymentsResult.data.nextCursor ?? null}
          />
        </Suspense>
      )}
    </>
  );
}
