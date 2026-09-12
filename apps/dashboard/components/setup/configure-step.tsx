/**
 * The body of a step that sends the operator to an agent's settings.
 */

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { RecheckButton } from './recheck-button';

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

/** Props for {@link ConfigureStep}. */
export interface ConfigureStepProps {
  /** Agent to link to, or `null` before one exists. */
  agentId: string | null;
  /** Name to put on the button. */
  agentName: string | null;
  /** Which half of the rules this step covers. */
  kind: ConfigureKind;
  /** Whether the rules are already saved, which retires the re-read button. */
  done: boolean;
}

/**
 * The body of a step that sends the operator to an agent's settings.
 *
 * @remarks The link opens in a new tab, so the guide stays where it was rather
 * than being replaced by the page it sent you to. That leaves this tab holding
 * a server render from before the change, hence the button beside it: pressing
 * it re-reads the agent and the step ticks if the rules are really there. Once
 * they are, the button goes — a control offering to re-check something already
 * settled is clutter on every visit afterwards.
 *
 * Deliberately a re-read and not a checkbox. Whether an agent has a budget is
 * a fact about the record, and a step somebody could tick by hand would let
 * them mark it done, move on, and meet the same refusal two steps later with
 * nothing to explain it.
 *
 * @param props Which agent to link to, and whether the step is behind us.
 */
export function ConfigureStep({ agentId, agentName, kind, done }: ConfigureStepProps) {
  const { body, action } = COPY[kind];

  return (
    <>
      <p className="text-text-secondary text-sm leading-relaxed">{body}</p>
      {agentId === null ? (
        <p className="text-text-muted text-xs leading-relaxed">
          Register an agent in step one. Rules are written per agent, so there is nothing to attach
          these to yet.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" asChild>
              <Link href={`/agents/${agentId}`} target="_blank" rel="noreferrer noopener">
                {action} {agentName}
                <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
                <span className="sr-only">(opens in a new tab)</span>
              </Link>
            </Button>
            {done ? null : <RecheckButton label="Check again" />}
          </div>
          {done ? null : (
            <p className="text-text-muted text-xs leading-relaxed">
              Opens in a new tab. Come back and press{' '}
              <strong className="text-text-secondary font-medium">Check again</strong> to re-read
              the agent — the step ticks only if the rules are actually saved.
            </p>
          )}
        </>
      )}
    </>
  );
}
