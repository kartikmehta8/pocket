'use client';

import { Save } from 'lucide-react';
import { useState, useTransition } from 'react';

import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { TokenList } from '@/components/ui/token-list';
import { IDLE_ACTION, type ActionState } from '@/lib/action-state';
import { setPolicyAction } from '@/lib/actions';
import { UNKNOWN_RECIPIENT_OPTIONS } from '@/lib/catalog';
import type { Policy, UnknownRecipientBehaviour } from '@/lib/types';

import { CategoryPicker } from './category-picker';

/** Props for {@link PolicyEditor}. */
export interface PolicyEditorProps {
  agentId: string;
  /** `null` when no policy exists yet; the editor starts from a deny-all draft. */
  policy: Policy | null;
}

/**
 * Full policy document editor: allowed assets, chains and categories, the
 * per-transaction ceiling, the trusted recipient list, what happens for an
 * unknown recipient, and the optional approval threshold.
 */
/**
 * The starting draft for an agent that has no policy yet.
 *
 * @remarks Deliberately restrictive: one asset, one chain, no trusted
 * recipients and unknown recipients blocked. An operator widens it on purpose
 * rather than discovering it was already open.
 */
const EMPTY_POLICY: Policy = {
  allowedAssets: ['USDC'],
  allowedChains: ['hedera-testnet'],
  allowedCategories: [],
  maxTransactionAmount: '0',
  trustedRecipients: [],
  unknownRecipientBehaviour: 'block',
  approvalThreshold: null,
};

/**
 * Edits an agent's whole spending policy.
 *
 * @param agentId Agent whose policy this is.
 * @param policy The stored policy, or `null` when none is configured yet.
 * @remarks Saving replaces the document rather than patching it. A policy that
 *   merged would let a rule survive an edit that was meant to remove it, which
 *   is the one mistake a spending rule must not make.
 */
export function PolicyEditor({ agentId, policy }: PolicyEditorProps) {
  const [draft, setDraft] = useState<Policy>(policy ?? EMPTY_POLICY);
  const [thresholdOn, setThresholdOn] = useState(policy?.approvalThreshold != null);
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  const [pending, startTransition] = useTransition();

  const patch = (next: Partial<Policy>) => setDraft((current) => ({ ...current, ...next }));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Policy</CardTitle>
          <CardDescription>
            Evaluated on every payment before any funds move. Saving replaces the whole document.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              setState(
                await setPolicyAction(agentId, {
                  ...draft,
                  approvalThreshold: thresholdOn ? (draft.approvalThreshold ?? '0') : null,
                }),
              );
            });
          }}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <Field htmlFor="policy-assets" label="Allowed assets">
              <TokenList
                id="policy-assets"
                values={draft.allowedAssets}
                onChange={(values) => patch({ allowedAssets: values })}
                placeholder="USDC"
                itemNoun="asset"
              />
            </Field>
            <Field htmlFor="policy-chains" label="Allowed chains">
              <TokenList
                id="policy-chains"
                values={draft.allowedChains}
                onChange={(values) => patch({ allowedChains: values })}
                placeholder="hedera-testnet"
                itemNoun="chain"
              />
            </Field>
          </div>

          <div>
            <p className="eyebrow mb-2">Allowed categories</p>
            <CategoryPicker
              selected={draft.allowedCategories}
              onChange={(values) => patch({ allowedCategories: values })}
            />
          </div>

          <Field
            htmlFor="policy-recipients"
            label="Trusted recipients"
            hint="Addresses on this list bypass the unknown-recipient rule."
          >
            <TokenList
              id="policy-recipients"
              values={draft.trustedRecipients}
              onChange={(values) => patch({ trustedRecipients: values })}
              placeholder="0x…"
              mono
              itemNoun="trusted recipient"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field htmlFor="policy-max" label="Max transaction amount">
              <Input
                id="policy-max"
                inputMode="decimal"
                className="figures"
                value={draft.maxTransactionAmount}
                onChange={(event) => patch({ maxTransactionAmount: event.target.value })}
              />
            </Field>

            <Field
              htmlFor="policy-threshold"
              label="Approval threshold"
              hint={
                thresholdOn
                  ? 'Anything at or above this waits for a person.'
                  : 'Off: nothing is held for approval.'
              }
            >
              <div className="flex items-center gap-2.5">
                <Input
                  id="policy-threshold"
                  inputMode="decimal"
                  className="figures"
                  disabled={!thresholdOn}
                  value={thresholdOn ? (draft.approvalThreshold ?? '') : ''}
                  placeholder={thresholdOn ? '0.00' : 'No threshold'}
                  onChange={(event) => patch({ approvalThreshold: event.target.value })}
                />
                <Switch
                  id="policy-threshold-on"
                  checked={thresholdOn}
                  onCheckedChange={setThresholdOn}
                  label="Hold payments above a threshold for approval"
                />
              </div>
            </Field>

            <div className="flex flex-col gap-1.5">
              <p className="eyebrow">Unknown recipient</p>
              <Segmented
                label="Behaviour for an unknown recipient"
                value={draft.unknownRecipientBehaviour}
                options={UNKNOWN_RECIPIENT_OPTIONS}
                onValueChange={(value: UnknownRecipientBehaviour) =>
                  patch({ unknownRecipientBehaviour: value })
                }
              />
            </div>
          </div>

          <div className="border-divider flex items-center gap-3 border-t pt-4">
            <Button type="submit" variant="primary" size="sm" icon={Save} loading={pending}>
              {pending ? 'Saving' : 'Save policy'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setDraft(policy ?? EMPTY_POLICY);
                setThresholdOn(policy?.approvalThreshold != null);
              }}
            >
              Reset
            </Button>
            <ActionFeedback state={state} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
