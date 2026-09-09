import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { AuditTrail } from '@/components/audit/audit-trail';
import { ApiErrorState } from '@/components/ui/api-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { listAudit } from '@/lib/api';

/** The audit trail is append-only but read live; never prerender it. */
export const dynamic = 'force-dynamic';

/** Tab title for the audit trail. */
export const metadata: Metadata = { title: 'Audit' };

/** Events per page. */
const PAGE_LIMIT = 50;

/** Audit trail: chronological, dense, with expandable JSON payloads. */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params['cursor'];
  const cursor = Array.isArray(raw) ? raw[0] : raw;

  const result = await listAudit({ limit: PAGE_LIMIT, ...(cursor ? { cursor } : {}) });

  return (
    <>
      <PageHeader
        eyebrow="Trail"
        title="Audit"
        description="Every actor, action and payload, newest first. Expand a row to read the raw event."
      />
      {!result.ok ? (
        <ApiErrorState subject="the audit trail" code={result.code} message={result.message} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{result.data.events.length} events</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <AuditTrail events={result.data.events} />
          </CardContent>
          {result.data.nextCursor ? (
            <CardFooter className="flex justify-end">
              <Button asChild size="sm">
                <Link href={`/audit?cursor=${encodeURIComponent(result.data.nextCursor)}`}>
                  Older events
                  <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
                </Link>
              </Button>
            </CardFooter>
          ) : null}
        </Card>
      )}
    </>
  );
}
