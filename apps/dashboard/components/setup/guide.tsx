'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { RESTART_COOKIE } from '@/lib/setup-restart';
import type { AgentDetail, AgentSummary } from '@/lib/types';
import { CompletionDialog } from './completion-dialog';
import { GuideHeader } from './guide-header';
import { ProgressRail } from './progress-rail';
import { RestartButton } from './restart-button';
import { SetupSteps } from './setup-steps';
import { type StepState } from './step';
import { Card, CardContent } from '@/components/ui/card';

/** Props for {@link Guide}. */
export interface GuideProps {
  /** Which of the five recorded steps live state says are behind the operator. */
  derived: boolean[];
  /** Whether the guide is rendering a fresh run rather than live progress. */
  restarted: boolean;
  /** The agent the guide is following, or `null` before one exists. */
  agent: AgentSummary | null;
  /** That agent's detail, which carries its balance and policy. */
  detail: AgentDetail | null;
  /** Whether key management is reachable. False for a machine principal. */
  keysAvailable: boolean;
  /** How many live keys exist, used to name the next one sensibly. */
  liveKeys: number;
  /** Where an agent runtime connects. */
  mcpUrl: string;
  /** Base URL of the example paid resource, or `null` when none is deployed. */
  resource: string | null;
  /** Where the documentation lives. */
  docsUrl: string;
}

/** A year, in seconds. A new agent spends the cookie long before this. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * The guide, and the control that starts it over.
 *
 * @remarks Two kinds of step live here. The first five leave a record, so the
 * server reads them and they tick on their own. The last two happen in a
 * terminal Pocket cannot see into, so the operator says when they are done and
 * the guide takes their word for it — no payment lookup, no window, nothing to
 * disagree with. Getting that wrong is how a finished setup ends up looking
 * unfinished.
 *
 * Restarting writes one cookie and asks the server to render again. It deletes
 * nothing: the agents, keys and payments an organization already has are all
 * still there, on their own pages. What it clears is this guide's idea of where
 * you had got to, which is the only thing anybody wants back when they say
 * "start again" — and it is offered at every point in the run, not only at the
 * end, because that is when people want it.
 */
export function Guide({
  derived,
  restarted,
  agent,
  detail,
  keysAvailable,
  liveKeys,
  mcpUrl,
  resource,
  docsUrl,
}: GuideProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [connected, setConnected] = useState(false);
  const [purchased, setPurchased] = useState(false);
  // The plaintext of a key created on this visit, held in memory only so step
  // six can fill it into the connection command. Never persisted.
  const [apiKey, setApiKey] = useState<string | null>(null);
  // Separate from `purchased` on purpose. Closing the dialog must not undo
  // the step that opened it, and Radix reports every dismissal — escape, the
  // scrim, the close button, a destination link — through `onOpenChange`.
  const [celebrating, setCelebrating] = useState(false);

  const restart = (): void => {
    document.cookie = `${RESTART_COOKIE}=${Date.now()}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    setConnected(false);
    setPurchased(false);
    setCelebrating(false);
    setApiKey(null);
    startTransition(() => {
      router.refresh();
    });
  };

  const reached = [...derived, connected, purchased];
  const total = reached.length;
  const next = reached.indexOf(false);
  const done = reached.filter(Boolean).length;
  const finished = done === total;

  /** Resolves one step's state from the run as a whole. */
  const stateOf = (position: number): StepState =>
    reached[position] === true ? 'done' : position === next ? 'current' : 'todo';

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <GuideHeader
            done={done}
            total={total}
            restarted={restarted}
            pending={pending}
            onRestart={restart}
          />

          <CardContent>
            <SetupSteps
              agent={agent}
              detail={detail}
              keysAvailable={keysAvailable}
              liveKeys={liveKeys}
              mcpUrl={mcpUrl}
              resource={resource}
              stateOf={stateOf}
              total={total}
              apiKey={apiKey}
              onMinted={setApiKey}
              onConnected={() => {
                setConnected(true);
              }}
              onPurchased={() => {
                setConnected(true);
                setPurchased(true);
                setCelebrating(true);
              }}
            />

            {/* Repeated at the foot of a finished run, because that is where the
              reader is when they get to the end of it. */}
            {finished ? (
              <div className="border-divider mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-text-muted text-sm">
                  That is the whole flow, end to end. Start it again to walk a new agent through.
                </p>
                <RestartButton
                  onRestart={restart}
                  pending={pending}
                  label="Restart guide, from the end"
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <ProgressRail reached={reached} docsUrl={docsUrl} />
      </div>

      <CompletionDialog open={celebrating} onOpenChange={setCelebrating} docsUrl={docsUrl} />
    </>
  );
}
