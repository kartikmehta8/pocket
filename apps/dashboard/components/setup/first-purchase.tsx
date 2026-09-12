/**
 * The body of the step that produces the first settled payment.
 */

import Link from 'next/link';

import { ConfirmStepButton } from './confirm-step-button';
import { CodeBlock } from '@/components/ui/code-block';

/** Props for {@link FirstPurchase}. */
export interface FirstPurchaseProps {
  /** The agent to name in the prompt, or `null` before one exists. */
  agentId: string | null;
  /** Base URL of the example paid resource, or `null` when none is deployed. */
  resource: string | null;
  /** Whether the step above is complete, which is what unlocks this one. */
  ready: boolean;
  /** Whether the operator has already confirmed the purchase. */
  done: boolean;
  /** Called when they confirm it. */
  onDone: () => void;
}

/**
 * The prompt that produces the first settled payment, and where to watch it.
 *
 * @remarks The prompt names the agent explicitly. A runtime with several
 * agents attached has no way to guess which wallet a request should spend
 * from, and picking one for the operator is exactly the decision Pocket exists
 * to keep out of the model's hands.
 *
 * Confirmed rather than verified. Reading a settlement back looked rigorous
 * and behaved badly: a purchase made from another agent, or before this run,
 * or beyond the window this page reads, all left a finished setup insisting it
 * was unfinished. The ledger is the record — this is a walkthrough.
 */
export function FirstPurchase({ agentId, resource, ready, done, onDone }: FirstPurchaseProps) {
  const naming = agentId === null ? '' : ` using agent ${agentId}`;
  const prompt =
    resource === null
      ? null
      : `Get current token prices from ${resource}/v1/market/prices${naming}, then tell me which asset moved most in the last 24 hours.`;

  return (
    <>
      {prompt === null ? (
        <p className="text-text-secondary text-sm leading-relaxed">
          No example resource is deployed for this environment, so there is no prompt to copy. Point
          your agent at any paid endpoint that answers 402 and the flow below is the same.
        </p>
      ) : (
        <CodeBlock wrap code={prompt} label="Example prompt" caption="Ask your agent" />
      )}

      {agentId === null ? (
        <p className="text-text-muted text-xs leading-relaxed">
          Register an agent in step one and this prompt will name it. Without a name a runtime
          holding several agents has no way to know which wallet to spend from.
        </p>
      ) : null}

      <div className="border-divider grid gap-3 rounded-md border p-3 sm:grid-cols-3">
        {[
          {
            title: 'It asks',
            body: 'The seller answers 402 with its price and terms. Nothing is signed yet.',
          },
          {
            title: 'Pocket decides',
            body: 'Budget, policy and recipient are checked. A refusal comes back as a reason.',
          },
          {
            title: 'Privy signs',
            body: 'Only on an allow. The payment settles on Hedera and the content is returned.',
          },
        ].map(({ title, body }) => (
          <div key={title}>
            <p className="text-text text-xs font-semibold tracking-tight">{title}</p>
            <p className="text-text-muted mt-0.5 text-xs leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {done ? null : (
        <ConfirmStepButton
          ready={ready}
          onDone={onDone}
          hint="Finishes the guide. The payment itself is on Payments either way."
          blocked="Unlocks once step six is done."
        />
      )}

      <p className="text-text-muted text-xs leading-relaxed">
        Every attempt lands on{' '}
        <Link
          href="/payments"
          className="text-accent-600 decoration-accent-300 hover:decoration-accent-600 underline underline-offset-2"
        >
          Payments
        </Link>{' '}
        and{' '}
        <Link
          href="/audit"
          className="text-accent-600 decoration-accent-300 hover:decoration-accent-600 underline underline-offset-2"
        >
          Audit
        </Link>
        , including the ones policy refused. A blocked payment is a row with a reason, not a
        discarded event.
      </p>
    </>
  );
}
