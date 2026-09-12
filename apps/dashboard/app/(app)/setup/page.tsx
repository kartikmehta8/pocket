/**
 * The setup guide. Seven steps from an empty organization to an agent that has
 * paid for its own data, each read from live state rather than from a
 * checkbox.
 */

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { getAgent, listAgents, listApiKeys } from '@/lib/api';
import { serviceUrls } from '@/lib/urls';
import { newestFirst, reachedSteps } from '@/lib/setup-progress';
import { readRestartAt, restartInEffect, RESTART_COOKIE } from '@/lib/setup-restart';
import { Guide } from '@/components/setup/guide';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

/** Tab title, and the card a shared link renders. */
export const metadata: Metadata = {
  title: 'Connect an agent',
  description: 'Seven steps from an empty organization to an agent that has paid for its own data.',
};

/** Live state decides which steps show as done, so nothing is prerendered. */
export const dynamic = 'force-dynamic';

/**
 * Setup: seven steps from an empty organization to a settled payment.
 *
 * @remarks Every step's completion is read from live state rather than a
 * remembered click, so returning to this page shows how far you actually got.
 * Only the first five are read that way. Connecting a runtime and making a
 * purchase happen in a terminal, so the operator confirms those two and the
 * guide believes them.
 *
 * The guide follows the newest agent. Restarting sets it aside and renders
 * exactly what somebody arriving for the first time sees — an empty run, with
 * the register form back on step one — until a new agent is named, at which
 * point the guide follows that one and the restart is spent.
 *
 * Newest first, so the guide follows the agent most recently registered.
 *
 * A failed listing is not an empty one. Treating it as empty would let a
 * transient API error read as "no agent registered since the restart" and
 * silently reopen a fresh run over an organization that has been set up for
 * weeks — with nothing on screen to explain it.
 *
 * A restart is a blank run: no agent to fetch, and nothing of the last one to
 * show. Skipping the reads is the point, not an optimisation.
 *
 * Key management needs a signed-in person. In API-key mode the call is refused,
 * which is not an error worth showing: the step explains why.
 */
export default async function SetupPage() {
  const [store, agentsResult, keysResult] = await Promise.all([
    cookies(),
    listAgents(),
    listApiKeys(),
  ]);

  const agents = agentsResult.ok ? [...agentsResult.data.agents].sort(newestFirst) : null;
  const newest = agents?.[0] ?? null;

  const restartAt =
    agents === null ? null : readRestartAt(store.get(RESTART_COOKIE)?.value, Date.now());
  const restarted = restartInEffect(restartAt, newest?.createdAt ?? null);

  const followed = restarted ? null : newest;
  const detailResult = followed === null ? null : await getAgent(followed.id);
  const detail = detailResult?.ok === true ? detailResult.data : null;
  const agent = detail?.agent ?? followed;

  const keys = keysResult.ok ? keysResult.data.keys.filter((key) => key.revokedAt === null) : [];
  const urls = serviceUrls();

  return (
    <>
      <PageHeader
        title="Connect an agent"
        description="Seven steps from an empty organization to an agent that has paid for its own data."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/agents">
              Agents
              <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
            </Link>
          </Button>
        }
      />

      <Guide
        derived={reachedSteps({ agent, detail, keys, keysAvailable: keysResult.ok })}
        restarted={restarted}
        agent={agent}
        detail={detail}
        keysAvailable={keysResult.ok}
        liveKeys={keys.length}
        mcpUrl={urls.mcp}
        resource={urls.paidService}
        docsUrl={urls.docs}
      />
    </>
  );
}
