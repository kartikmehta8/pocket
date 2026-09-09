'use client';

import { TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Last-resort boundary. Data fetches already degrade to calm empty states, so
 * reaching this means a genuine render fault.
 *
 * @param error The thrown error.
 * @param reset Re-renders the segment.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description={error.message || 'An unexpected error occurred while rendering this page.'}
        action={
          <Button variant="secondary" size="sm" onClick={reset}>
            Try again
          </Button>
        }
      />
    </Card>
  );
}
