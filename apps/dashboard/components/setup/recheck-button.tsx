'use client';

/**
 * The control that re-reads a step's state.
 */

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Re-reads this page's state from the chain and the database.
 *
 * @remarks Deliberately not an "I have funded it" checkbox. Whether the money
 * arrived is a fact about the ledger, and a step that can be ticked by hand
 * would let someone mark it done, move on, and meet the same refusal three
 * steps later with nothing to explain it. This asks again instead.
 */
export function RecheckButton({ label = 'Check again' }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      icon={RefreshCw}
      loading={pending}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    >
      {pending ? 'Checking' : label}
    </Button>
  );
}
