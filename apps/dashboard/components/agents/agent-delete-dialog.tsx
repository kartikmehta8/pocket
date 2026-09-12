'use client';

/**
 * The modal that retires an agent, and moves what is in its wallet first.
 */

import { ArrowRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FaucetLink } from '@/components/wallet/faucet-menu';
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
 * Moving is not always possible. A wallet with no HBAR cannot pay for the
 * transfer, and a lone agent has nowhere to send to, so deleting and leaving
 * the balance is offered as well. Never as the default, and never silently:
 * what was left, and where, goes into the audit trail.
 *
 * The payments the agent made are not deleted. The dialog says so, because
 * "delete" reads as "erase the evidence" in a product whose whole claim is
 * that it keeps the evidence.
 *
 * The dialog tracks whether the balance has already been moved on this visit. A
 * delete can fail after a successful transfer — a chain that has not caught up
 * still reports the old balance — and pressing again must not send the money a
 * second time, nor fail on a wallet that is now empty. That flag is read from a
 * local rather than from state, because `setMoved` does not change what the
 * closure already captured and the delete two lines down has to know.
 *
 * The delete is forced after a sweep, because the wallet it just emptied can
 * still read as funded while the mirror node lags a few seconds behind the
 * transfer. Without that the delete is refused and the operator has to press
 * again for no reason they could see; where the money went is in the audit
 * trail, one entry above the deletion.
 *
 * Only the HBAR faucet is offered. The transfer is the only thing here that
 * costs gas, and the API refuses it up front with a message naming HBAR, so
 * matching that word is enough to know which faucet helps. Offering both would
 * make the reader choose again having just been told what is missing.
 *
 * Deleting without moving the balance is offered but never taken by default.
 * Moving is impossible when the wallet has no gas for the fee, and an agent
 * that can be neither emptied nor deleted is one nobody can ever be rid of.
 * Choosing it clears the refusal on screen, which was about the transfer the
 * operator has just opted out of and would otherwise read as a fresh failure.
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
  const leaveId = useId();
  const [destination, setDestination] = useState(others[0]?.id ?? '');
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  const [moved, setMoved] = useState(false);
  const [leaveFunds, setLeaveFunds] = useState(false);
  const [pending, startTransition] = useTransition();

  const plan = planDelete(balance, others, moved, leaveFunds);
  const needsGas = state.status === 'error' && state.message.includes('HBAR');

  const run = () =>
    startTransition(async () => {
      let swept = moved;
      if (plan.moveFirst) {
        const transfer = await transferAgentFundsAction(agent.id, destination);
        if (transfer.status === 'error') {
          setState(transfer);
          return;
        }
        swept = true;
        setMoved(true);
      }
      const deleted = await deleteAgentAction(agent.id, leaveFunds || swept);
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
              There is no other agent to move the funds to. Register one first, or delete this agent
              and leave the balance where it is.
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
              : leaveFunds
                ? 'The balance stays in this wallet. Privy still custodies it, and the address is recorded in the audit trail.'
                : 'The wallet is empty, so nothing has to be moved first.'}
          </p>
        )}

        {plan.offerLeaveFunds ? (
          <label className="text-text-secondary flex cursor-pointer items-start gap-2.5 text-sm">
            <Switch
              id={leaveId}
              checked={leaveFunds}
              onCheckedChange={(checked) => {
                setLeaveFunds(checked);
                setState(IDLE_ACTION);
              }}
              label="Delete without moving the balance"
              className="mt-0.5"
            />
            <span className="leading-snug">
              Delete without moving it. For when the transfer cannot go through, such as a wallet
              with no HBAR for the fee.
            </span>
          </label>
        ) : null}

        <p className="text-text-muted text-xs leading-relaxed">
          Its payments stay on Payments and Audit under the name it had. Deleting an agent hides the
          agent, never the record of what it spent.
        </p>

        <ActionFeedback state={state} />

        {needsGas ? (
          <div className="border-border bg-ash-25 flex flex-col gap-2 rounded-md border p-3">
            <p className="text-text-secondary text-xs leading-relaxed">
              A transfer is a transaction, so the wallet pays a fee in HBAR. Take a little from the
              faucet and try again — the agent never spends it on anything else.
            </p>
            <FaucetLink asset="HBAR" className="w-fit" />
          </div>
        ) : null}

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
