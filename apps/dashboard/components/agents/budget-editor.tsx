'use client';

import { Save } from 'lucide-react';
import { useState, useTransition } from 'react';

import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { IDLE_ACTION, type ActionState } from '@/lib/action-state';
import { setBudgetAction } from '@/lib/actions';
import type { AgentSummary } from '@/lib/types';

/** Props for {@link BudgetEditor}. */
export interface BudgetEditorProps {
  agentId: string;
  budget: AgentSummary['budget'];
}

/**
 * Daily and per-transaction limit editor. Amounts stay decimal strings from
 * the input through to the API — nothing is parsed into a number on the way.
 */
export function BudgetEditor({ agentId, budget }: BudgetEditorProps) {
  const [asset, setAsset] = useState(budget?.asset ?? 'USDC');
  const [dailyLimit, setDailyLimit] = useState(budget?.dailyLimit ?? '0');
  const [perTransactionLimit, setPerTransactionLimit] = useState(
    budget?.perTransactionLimit ?? '0',
  );
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Budget</CardTitle>
          <CardDescription>Hard ceilings enforced before every payment.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              setState(await setBudgetAction(agentId, { asset, dailyLimit, perTransactionLimit }));
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              htmlFor="budget-asset"
              label="Asset"
              info="The one asset this agent may spend. A payment in anything else is refused before it reaches the policy."
            >
              <Input
                id="budget-asset"
                value={asset}
                onChange={(event) => setAsset(event.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field
              htmlFor="budget-daily"
              label="Daily limit"
              hint="Resets at UTC midnight."
              info="The most this agent may settle in a day. A payment that would take today's spend past it is refused, so the limit holds even when several are in flight at once."
            >
              <Input
                id="budget-daily"
                inputMode="decimal"
                className="figures"
                value={dailyLimit}
                onChange={(event) => setDailyLimit(event.target.value)}
              />
            </Field>
            <Field
              htmlFor="budget-per-tx"
              label="Per transaction"
              info="The most this agent may spend in one payment. The policy sets a ceiling of its own; whichever is lower is the one that stops a payment."
            >
              <Input
                id="budget-per-tx"
                inputMode="decimal"
                className="figures"
                value={perTransactionLimit}
                onChange={(event) => setPerTransactionLimit(event.target.value)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" size="sm" icon={Save} loading={pending}>
              {pending ? 'Saving' : 'Save budget'}
            </Button>
            <ActionFeedback state={state} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
