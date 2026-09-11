'use client';

import { ArrowRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { IDLE_ACTION, type ActionState } from '@/lib/action-state';
import { deleteAgentAction, transferAgentFundsAction } from '@/lib/actions';
import { planDelete } from '@/lib/agent-delete';
import { formatAmount } from '@/lib/format';
import type { AgentSummary, Balance } from '@/lib/types';

/** Props for {@link AgentDeleteDialog}. */
export interface AgentDeleteDialogProps {
  agent: AgentSummary;
  /** What the wallet holds, or `null` when the chain would not say. */
  balance: Balance | null;
  /**
   * Where the balance could go: every other agent that can still spend it.
   *
   * @remarks Revoked agents are not offered. Moving funds into one strands
   * them exactly as deleting would, which is the thing this dialog exists to
   * prevent.
   */
  others: AgentSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Retiring an agent, and moving what is in its wallet first.
 *
 * @remarks The API refuses to delete an agent whose wallet still holds funds,
 * because the alternative is money stranded behind a page nobody can reach
 * any more. So this asks the one question that has an answer at that moment:
 * which agent should have it. The move and the delete are one press, and a
 * failed move stops before the delete rather than doing half of it.
 *
 * The payments the agent made are not deleted. The dialog says so, because
 * "delete" reads as "erase the evidence" in a product whose whole claim is
 * that it keeps the evidence.
 */
export function AgentDeleteDialog({
  agent,
  balance,
  others,
  open,
  onOpenChange,
}: AgentDeleteDialogProps) {
  const router = useRouter();
  const selectId = useId();
  const [destination, setDestination] = useState(others[0]?.id ?? '');
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  // Whether the balance has already been moved on this visit. The delete can
  // fail after a successful transfer — a chain that has not caught up still
  // reports the old balance — and pressing again must not send the money a
  // second time, nor fail on a wallet that is now empty.
  const [moved, setMoved] = useState(false);
  const [pending, startTransition] = useTransition();

  const plan = planDelete(balance, others, moved);

  const run = () =>
    startTransition(async () => {
      if (plan.moveFirst) {
        const transfer = await transferAgentFundsAction(agent.id, destination);
        if (transfer.status === 'error') {
          setState(transfer);
          return;
        }
        setMoved(true);
      }
      const deleted = await deleteAgentAction(agent.id);
      setState(deleted);
      if (deleted.status === 'error') return;
      onOpenChange(false);
      router.push('/agents');
      router.refresh();
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
      title={`Delete ${agent.name}?`}
      description="It stops being offered anywhere and can no longer spend."
    >
      <div className="flex flex-col gap-4">
        <dl className="divide-divider border-divider divide-y border-y">
          <div className="flex items-baseline justify-between gap-4 py-2">
            <dt className="text-text-muted text-xs font-medium">Wallet holds</dt>
            <dd className="figures text-text text-sm font-semibold">
              {balance === null ? 'Unknown' : formatAmount(balance.amount, balance.asset)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2">
            <dt className="text-text-muted text-xs font-medium">Payments made</dt>
            <dd className="figures text-text text-sm font-semibold">{agent.spend.paymentCount}</dd>
          </div>
        </dl>

        {plan.moveFirst ? (
          plan.stranded ? (
            <p className="text-warning-ink bg-warning-soft border-border rounded-md border p-3 text-sm leading-relaxed">
              This is your only agent, so there is nowhere to move the funds. Register another agent
              first, or spend the balance down.
            </p>
          ) : (
            <Field
              htmlFor={selectId}
              label="Move the balance to"
              hint="The whole balance moves in one transaction before the agent is deleted."
            >
              <Select
                id={selectId}
                value={destination}
                onValueChange={setDestination}
                options={others.map((other) => ({
                  value: other.id,
                  label: other.status === 'active' ? other.name : `${other.name} (${other.status})`,
                }))}
              />
            </Field>
          )
        ) : (
          <p className="text-text-secondary text-sm leading-relaxed">
            {moved
              ? 'The balance has moved. Press again to finish deleting.'
              : 'The wallet is empty, so nothing has to be moved first.'}
          </p>
        )}

        <p className="text-text-muted text-xs leading-relaxed">
          Its payments stay on Payments and Audit under the name it had. Deleting an agent hides the
          agent, never the record of what it spent.
        </p>

        <ActionFeedback state={state} />

        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            icon={plan.moveFirst ? ArrowRight : Trash2}
            loading={pending}
            disabled={!plan.canProceed}
            onClick={run}
          >
            {pending ? 'Deleting' : plan.label}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
