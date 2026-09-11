'use client';

import { KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { activateWalletAction } from '@/lib/actions-account';
import type { ActionState } from '@/lib/action-state';
import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';

/** Props for {@link ActivateButton}. */
export interface ActivateButtonProps {
  /** Agent whose wallet should sign. */
  agentId: string;
}

/** Nothing has been attempted yet. */
const IDLE: ActionState = { status: 'idle', message: '' };

/**
 * Publishes a wallet's key so a faucet will accept its account.
 *
 * @param props The agent to act on.
 * @remarks The wallet signs a transfer of nothing to itself. That costs a
 * fraction of a cent in gas and moves no money, and it is the only way to
 * complete a Hedera account created by an incoming transfer — which is the
 * kind every wallet here starts out with.
 *
 * The API holds its response until the key is readable on a mirror node, so
 * by the time this refreshes, the funding step has something new to draw.
 */
export function ActivateButton({ agentId }: ActivateButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>(IDLE);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          icon={KeyRound}
          loading={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await activateWalletAction(agentId);
              setState(result);
              // `revalidatePath` inside the action marks the cache stale but
              // does not redraw what is already on screen, and an action
              // called from an event handler returns no new payload to render.
              // Without this the step keeps asking for a signature it has
              // already got, and only a second press appears to work.
              if (result.status === 'success') router.refresh();
            });
          }}
        >
          {pending ? 'Publishing' : 'Publish the key'}
        </Button>
        <span className="text-text-muted text-xs">Signs once. Moves no money.</span>
      </div>
      <ActionFeedback state={state} />
    </div>
  );
}
