import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuditBrowser } from '@/components/audit/audit-browser';
import { ApiErrorState } from '@/components/ui/api-error';
import { PageHeader } from '@/components/ui/page-header';
import { listAgents, listAudit } from '@/lib/api';
import { AUDIT_ACTIVITIES, AUDIT_ACTORS } from '@/lib/catalog';
import type { AuditEvent } from '@/lib/types';

/** The audit trail is append-only but read live; never prerender it. */
export const dynamic = 'force-dynamic';

/** Tab title for the audit trail. */
export const metadata: Metadata = { title: 'Audit' };

/** Events per page. */
const PAGE_LIMIT = 30;

/** Read a single search param as a string, ignoring repeats. */
function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Narrow a raw query value to an action family the filter offers. */
function readActivity(value: string): string {
  return AUDIT_ACTIVITIES.some((activity) => activity.value === value) ? value : '';
}

/** Narrow a raw query value to an actor type. */
function readActor(value: string): AuditEvent['actorType'] | undefined {
  return AUDIT_ACTORS.find((actor) => actor === value);
}

/** Read the page number, counting from one. Anything odd is page one. */
function readPage(value: string): number {
  return /^[1-9]\d{0,4}$/.test(value) ? Number(value) : 1;
}

/**
 * Audit trail: every actor, action and payload, newest first.
 *
 * @remarks Filters and the cursor live in the URL, so any view can be shared
 * and the browser's back button walks the pages. Unknown filter values are
 * ignored rather than forwarded: the API would refuse them, and a stale link
 * should show the trail, not an error.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const cursor = readParam(params['cursor']);
  const page = cursor === '' ? 1 : readPage(readParam(params['page']));
  const action = readActivity(readParam(params['action']));
  const actorType = readActor(readParam(params['actorType']));

  const [result, agentsResult] = await Promise.all([
    listAudit({
      limit: PAGE_LIMIT,
      ...(cursor === '' ? {} : { cursor }),
      ...(action === '' ? {} : { action }),
      ...(actorType ? { actorType } : {}),
    }),
    listAgents(),
  ]);
  // Names are a courtesy. A failed listing leaves ids in the agent column
  // rather than taking the trail down with it.
  const agents = Object.fromEntries(
    (agentsResult.ok ? agentsResult.data.agents : []).map((agent) => [agent.id, agent.name]),
  );

  return (
    <>
      <PageHeader
        title="Audit"
        description="Every actor, action and payload, newest first. Expand a row to read the raw event."
      />
      {!result.ok ? (
        <ApiErrorState subject="the audit trail" code={result.code} message={result.message} />
      ) : (
        <Suspense fallback={null}>
          <AuditBrowser
            events={result.data.events}
            agents={agents}
            action={action}
            actorType={actorType ?? ''}
            nextCursor={result.data.nextCursor}
            page={page}
          />
        </Suspense>
      )}
    </>
  );
}
