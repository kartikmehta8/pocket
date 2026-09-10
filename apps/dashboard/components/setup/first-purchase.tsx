import Link from 'next/link';

import { CodeBlock } from '@/components/ui/code-block';

/** Props for {@link FirstPurchase}. */
export interface FirstPurchaseProps {
  /** The agent to name in the prompt, or `null` before one exists. */
  agentId: string | null;
  /** Base URL of the example paid resource. */
  resource: string;
}

/**
 * The prompt that produces the first settled payment, and where to watch it.
 *
 * @remarks The prompt names the agent explicitly. A runtime with several
 * agents attached has no way to guess which wallet a request should spend
 * from, and picking one for the operator is exactly the decision Pocket exists
 * to keep out of the model's hands.
 */
export function FirstPurchase({ agentId, resource }: FirstPurchaseProps) {
  const prompt =
    agentId === null
      ? `Get current token prices from ${resource}/v1/market/prices, then tell me which asset moved most in the last 24 hours.`
      : `Get current token prices from ${resource}/v1/market/prices using agent ${agentId}, then tell me which asset moved most in the last 24 hours.`;

  return (
    <>
      <CodeBlock wrap code={prompt} label="Example prompt" caption="Ask your agent" />

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

      <p className="text-text-muted text-xs leading-relaxed">
        Every attempt lands on{' '}
        <Link href="/payments" className="text-accent-600 hover:underline">
          Payments
        </Link>{' '}
        and{' '}
        <Link href="/audit" className="text-accent-600 hover:underline">
          Audit
        </Link>
        , including the ones policy refused. A blocked payment is a row with a reason, not a
        discarded event.
      </p>
    </>
  );
}
