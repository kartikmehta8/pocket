/**
 * The surface shown when a server-side fetch fails.
 */

import { Unplug } from 'lucide-react';

import { Card } from './card';
import { EmptyState } from './empty-state';

/** Props for {@link ApiErrorState}. */
export interface ApiErrorStateProps {
  /** What could not be loaded, e.g. `"agents"`. */
  subject: string;
  /** Contract error code, shown for triage. */
  code: string;
  /** Display-safe message from the API or transport. */
  message: string;
}

/**
 * Calm failure surface used whenever a server-side fetch returns `ApiErr`.
 * Every page renders one of these instead of throwing, so an API that is not
 * running produces a readable screen rather than a crash.
 */
export function ApiErrorState({ subject, code, message }: ApiErrorStateProps) {
  return (
    <Card>
      <EmptyState
        icon={Unplug}
        title={`Could not load ${subject}`}
        description={message}
        action={
          <code className="figures bg-ash-50 text-2xs text-text-muted rounded-sm px-1.5 py-0.5 font-mono">
            {code}
          </code>
        }
      />
    </Card>
  );
}
