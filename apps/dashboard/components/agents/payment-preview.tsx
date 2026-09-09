'use client';

import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { IDLE_PREVIEW } from '@/lib/action-state';
import { previewPaymentAction } from '@/lib/actions';
import { CATEGORIES, categoryLabel } from '@/lib/catalog';

import { DecisionReveal } from './decision-reveal';

/** Props for {@link PaymentPreview}. */
export interface PaymentPreviewProps {
  agentId: string;
  defaultAsset: string;
  defaultChain: string;
}

const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({
  value: category,
  label: categoryLabel(category),
}));

/**
 * Dry-run a payment against this agent's policy via `POST /v1/payments/preview`.
 * Nothing is spent; the verdict is revealed beneath the form.
 */
export function PaymentPreview({ agentId, defaultAsset, defaultChain }: PaymentPreviewProps) {
  const [state, formAction, pending] = useActionState(previewPaymentAction, IDLE_PREVIEW);
  const [category, setCategory] = useState<string>('research');

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Preview a payment</CardTitle>
          <CardDescription>
            Evaluate a proposed payment against this agent&apos;s policy. Nothing is spent.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="agentId" value={agentId} />
          <input type="hidden" name="category" value={category} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field htmlFor="preview-amount" label="Amount">
              <Input
                id="preview-amount"
                name="amount"
                required
                inputMode="decimal"
                className="figures"
                defaultValue="0.08"
              />
            </Field>
            <Field htmlFor="preview-asset" label="Asset">
              <Input id="preview-asset" name="asset" required defaultValue={defaultAsset} />
            </Field>
            <Field htmlFor="preview-chain" label="Chain">
              <Input id="preview-chain" name="chain" required defaultValue={defaultChain} />
            </Field>
            <Field htmlFor="preview-category" label="Category">
              <Select
                id="preview-category"
                value={category}
                options={CATEGORY_OPTIONS}
                onValueChange={setCategory}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="preview-recipient" label="Recipient">
              <Input
                id="preview-recipient"
                name="recipient"
                required
                placeholder="0x…"
                className="font-mono text-xs"
              />
            </Field>
            <Field htmlFor="preview-reason" label="Reason">
              <Input
                id="preview-reason"
                name="reason"
                required
                placeholder="Market intelligence for ETH ecosystem research"
              />
            </Field>
          </div>
          <div>
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? 'Evaluating…' : 'Evaluate'}
            </Button>
          </div>
        </form>
        <DecisionReveal
          decision={state.decision}
          error={state.status === 'error' ? state.message : ''}
          revision={state.revision}
        />
      </CardContent>
    </Card>
  );
}
