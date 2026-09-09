'use client';

import { Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { revokeApiKeyAction } from '@/lib/actions-account';
import { IDLE_ACTION, type ActionState } from '@/lib/action-state';
import { formatDateTime } from '@/lib/format';
import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/tooltip';
import type { ApiKey } from '@/lib/types';

/**
 * One credential, with the control that retires it.
 *
 * Revoking is immediate and cannot be undone, so it asks once. The API refuses
 * to revoke the last live key regardless of what this component allows.
 *
 * @param apiKey The key summary. Never carries secret material.
 * @param canRevoke Whether more than one live key exists.
 */
export function ApiKeyRow({ apiKey, canRevoke }: { apiKey: ApiKey; canRevoke: boolean }) {
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const revoked = apiKey.revokedAt !== null;

  function revoke() {
    startTransition(async () => {
      setState(await revokeApiKeyAction(apiKey.id));
      setConfirming(false);
    });
  }

  return (
    <li className="border-divider flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-text truncate text-sm font-medium">{apiKey.label}</p>
          {revoked ? (
            <span className="bg-ash-100 text-text-muted ring-ash-200 text-2xs rounded-full px-1.5 py-0.5 font-medium ring-1 ring-inset">
              Revoked
            </span>
          ) : null}
        </div>
        <p className="text-text-muted mt-0.5 font-mono text-xs">
          {apiKey.prefix}
          <span aria-hidden>…</span>
          <span className="sr-only">, remainder hidden</span>
        </p>
        <p className="text-text-muted mt-0.5 text-xs">
          Created {formatDateTime(apiKey.createdAt)}
          {revoked && apiKey.revokedAt ? ` · revoked ${formatDateTime(apiKey.revokedAt)}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ActionFeedback state={state} className="min-h-0" />
        {revoked ? null : confirming ? (
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={revoke} disabled={pending}>
              {pending ? 'Revoking…' : 'Confirm revoke'}
            </Button>
          </>
        ) : (
          <Hint
            label={
              canRevoke
                ? 'Anything still presenting this key stops working immediately.'
                : 'Create a replacement first. Revoking the last key would lock every agent runtime out.'
            }
          >
            <span>
              <Button variant="danger" onClick={() => setConfirming(true)} disabled={!canRevoke}>
                <Trash2 aria-hidden className="size-3.5" strokeWidth={2} />
                Revoke
              </Button>
            </span>
          </Hint>
        )}
      </div>
    </li>
  );
}
