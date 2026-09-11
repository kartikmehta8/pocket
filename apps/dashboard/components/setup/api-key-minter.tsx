'use client';

import { KeyRound, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useActionState, useEffect, useId } from 'react';

import { createApiKeyAction } from '@/lib/actions-account';
import { IDLE_SECRET } from '@/lib/action-state';
import { DURATION, EASE } from '@/lib/motion';
import { ActionFeedback } from '@/components/ui/action-feedback';
import { Button, SUBMIT_WIDTH } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { Field, Input } from '@/components/ui/field';

/** Props for {@link ApiKeyMinter}. */
export interface ApiKeyMinterProps {
  /** How many live keys exist, used to name the next one sensibly. */
  existing: number;
  /**
   * Called with the plaintext the moment a key is created.
   *
   * @remarks The setup guide uses this to fill the key into the connection
   * command one step down, so nobody has to copy it from one box into another.
   */
  onMinted?: (secret: string) => void;
}

/**
 * Mints an API key and reveals it once.
 *
 * The plaintext exists only in the action's return value. Nothing stores it, so
 * the reveal is emphatic about being the only chance to copy it.
 *
 * @param props How many live keys exist, and where to hand the new one.
 */
export function ApiKeyMinter({ existing, onMinted }: ApiKeyMinterProps) {
  const [state, submit, pending] = useActionState(createApiKeyAction, IDLE_SECRET);

  useEffect(() => {
    if (state.secret !== '') onMinted?.(state.secret);
    // Keyed on the revision, not the secret: two keys are never the same, but
    // the effect should fire once per creation, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.revision]);
  const labelId = useId();
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col gap-3">
      <form action={submit}>
        <Field
          htmlFor={labelId}
          label="Key name"
          hint="Name it after what will use it, so you can revoke that one thing later."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={labelId}
              name="label"
              defaultValue={existing === 0 ? 'MCP server' : `MCP server ${existing + 1}`}
              maxLength={60}
              className="w-full max-w-xs min-w-[11rem] flex-1"
              required
            />
            <Button
              type="submit"
              variant="primary"
              icon={KeyRound}
              loading={pending}
              className={SUBMIT_WIDTH}
            >
              {pending ? 'Creating' : 'Create key'}
            </Button>
          </div>
        </Field>
      </form>

      <AnimatePresence initial={false}>
        {state.secret === '' ? null : (
          <motion.div
            key={state.revision}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="border-border bg-warning-soft rounded-md border p-3"
          >
            <p className="text-warning-ink flex items-center gap-1.5 text-sm font-medium">
              <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2.25} />
              Copy this now
            </p>
            <p className="text-warning-ink/85 mt-1 text-xs leading-relaxed">
              Only a hash is stored. Closing this page loses the key, and the only remedy is to
              create another one.
            </p>
            <CodeBlock
              className="border-border bg-surface mt-2.5"
              code={state.secret}
              label="API key"
              caption="POCKET_API_KEY"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ActionFeedback state={state} />
    </div>
  );
}
