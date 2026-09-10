import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/** Which half of the spending rules a step is asking for. */
export type ConfigureKind = 'budget' | 'policy';

/** What each half is, and what it does not cover on its own. */
const COPY: Record<ConfigureKind, { body: string; action: string }> = {
  budget: {
    body: 'Spend resets at midnight UTC. A blocked attempt costs nothing against it, and neither does one that failed after signing.',
    action: 'Set a budget for',
  },
  policy: {
    body: 'Name the allowed assets, chains and categories, the per-payment ceiling, and the recipients you trust. Anything above the approval threshold waits for a human. This is deny by default: a budget alone buys nothing.',
    action: 'Write a policy for',
  },
};

/**
 * The body of a step that sends the operator to an agent's settings.
 *
 * @param agentId Agent to link to, or `null` before one exists.
 * @param agentName Name to put on the button.
 * @param kind Which half of the rules this step covers.
 */
export function ConfigureStep({
  agentId,
  agentName,
  kind,
}: {
  agentId: string | null;
  agentName: string | null;
  kind: ConfigureKind;
}) {
  const { body, action } = COPY[kind];

  return (
    <>
      <p className="text-text-secondary text-sm leading-relaxed">{body}</p>
      {agentId === null ? null : (
        <div>
          <Button variant="secondary" asChild>
            <Link href={`/agents/${agentId}`}>
              {action} {agentName}
              <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}
