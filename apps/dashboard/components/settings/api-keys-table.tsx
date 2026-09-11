'use client';

import { Ban, CircleCheck, KeyRound, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { ActionFeedback } from '@/components/ui/action-feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableFrame, TBody, TD, TH, THead } from '@/components/ui/table';
import { Hint } from '@/components/ui/tooltip';
import { IDLE_ACTION, type ActionState } from '@/lib/action-state';
import { revokeApiKeyAction } from '@/lib/actions-account';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import type { ApiKey } from '@/lib/types';

/** What one key needs to render, whichever shape it takes. */
interface RowProps {
  apiKey: ApiKey;
  /** Whether revoking this key would leave at least one other live. */
  canRevoke: boolean;
}

/** The recognisable start of a key. The rest was never stored. */
function Prefix({ apiKey }: { apiKey: ApiKey }) {
  return (
    <span className="figures text-text-secondary font-mono text-xs">
      {apiKey.prefix}
      <span aria-hidden>…</span>
      <span className="sr-only">, remainder hidden</span>
    </span>
  );
}

/** Live or revoked, as a badge. */
function Status({ apiKey }: { apiKey: ApiKey }) {
  return apiKey.revokedAt === null ? (
    <Badge tone="success" icon={CircleCheck} hint="Accepted by the API and the MCP server.">
      Active
    </Badge>
  ) : (
    <Badge tone="neutral" icon={Ban} hint={`Revoked ${formatDateTime(apiKey.revokedAt)}.`}>
      Revoked
    </Badge>
  );
}

/**
 * Revoke, behind a confirmation, with the outcome announced beneath.
 *
 * @remarks Two presses, never one: anything still presenting the key stops
 * working the moment this succeeds, and there is no undo. The second press
 * lands on the same button in the same place — it changes its word, not its
 * size, so nothing in the row moves. Moving focus away, or pressing Escape,
 * stands the request down.
 */
function Revoke({ apiKey, canRevoke }: RowProps) {
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (apiKey.revokedAt !== null) return null;

  const revoke = () =>
    startTransition(async () => {
      setState(await revokeApiKeyAction(apiKey.id));
      setConfirming(false);
    });

  const hint = !canRevoke
    ? 'Create a replacement first. Revoking the last key would lock every agent runtime out.'
    : confirming
      ? 'Press again to revoke. Click anywhere else to keep the key.'
      : 'Anything still presenting this key stops working immediately.';

  return (
    <div className="flex flex-col items-end gap-1">
      <Hint label={hint}>
        {/* Focusable only while the button is not, because a disabled button
            takes no focus and this tooltip carries the only explanation of
            why it is disabled. Enabled, it would be a redundant tab stop. */}
        <span tabIndex={canRevoke ? undefined : 0} className="inline-flex">
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            loading={pending}
            disabled={!canRevoke}
            aria-label={confirming ? `Confirm revoking ${apiKey.label}` : `Revoke ${apiKey.label}`}
            onClick={() => (confirming ? revoke() : setConfirming(true))}
            onBlur={() => setConfirming(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setConfirming(false);
            }}
            className="w-28"
          >
            {pending ? 'Revoking' : confirming ? 'Confirm' : 'Revoke'}
          </Button>
        </span>
      </Hint>
      {state.status === 'error' ? (
        <ActionFeedback state={state} className="min-h-0 text-right" />
      ) : null}
    </div>
  );
}

/** One key at phone width: stacked, with the control on its own line. */
function KeyCard({ apiKey, canRevoke }: RowProps) {
  return (
    <li className="[&+li]:border-divider flex flex-col gap-2 px-4 py-3 [&+li]:border-t">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-text text-sm font-medium">{apiKey.label}</p>
        <Status apiKey={apiKey} />
      </div>
      <p className="text-text-muted flex flex-wrap items-center gap-x-2 text-xs">
        <Prefix apiKey={apiKey} />
        <span aria-hidden>·</span>
        <span>Created {formatDateTime(apiKey.createdAt)}</span>
      </p>
      <Revoke apiKey={apiKey} canRevoke={canRevoke} />
    </li>
  );
}

/** One key as a table row. */
function KeyRow({ apiKey, canRevoke }: RowProps) {
  return (
    <tr
      className={cn(
        '[&>td]:border-divider [&:first-child>td]:border-t-0 [&>td]:border-t',
        'hover:bg-ash-25 transition-colors duration-(--duration-fast) ease-(--ease-brand)',
        apiKey.revokedAt === null ? '' : 'text-text-muted',
      )}
    >
      <TD className="font-medium whitespace-nowrap">{apiKey.label}</TD>
      <TD>
        <Prefix apiKey={apiKey} />
      </TD>
      <TD className="text-text-secondary whitespace-nowrap">
        <time dateTime={apiKey.createdAt}>{formatDateTime(apiKey.createdAt)}</time>
      </TD>
      <TD>
        <Status apiKey={apiKey} />
      </TD>
      <TD numeric>
        <Revoke apiKey={apiKey} canRevoke={canRevoke} />
      </TD>
    </tr>
  );
}

/** Props for {@link ApiKeysTable}. */
export interface ApiKeysTableProps {
  keys: ApiKey[];
}

/**
 * Every key the organization has issued, live ones first.
 *
 * @remarks The last live key cannot be revoked from here: with nothing left
 * to present, every agent runtime would be locked out at once. Create a
 * replacement, then retire the old one.
 */
export function ApiKeysTable({ keys }: ApiKeysTableProps) {
  const live = keys.filter((key) => key.revokedAt === null).length;
  const ordered = [...keys].sort(
    (a, b) => Number(a.revokedAt !== null) - Number(b.revokedAt !== null),
  );

  if (keys.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title="No keys yet"
        description="Create one so your MCP server can authenticate."
      />
    );
  }

  return (
    <>
      <ul className="md:hidden">
        {ordered.map((key) => (
          <KeyCard key={key.id} apiKey={key} canRevoke={live > 1} />
        ))}
      </ul>

      <TableFrame className="hidden md:block">
        <Table>
          <THead>
            <TH>Name</TH>
            <TH>Key</TH>
            <TH>Created</TH>
            <TH>Status</TH>
            <TH>
              <span className="sr-only">Actions</span>
            </TH>
          </THead>
          <TBody>
            {ordered.map((key) => (
              <KeyRow key={key.id} apiKey={key} canRevoke={live > 1} />
            ))}
          </TBody>
        </Table>
      </TableFrame>
    </>
  );
}
