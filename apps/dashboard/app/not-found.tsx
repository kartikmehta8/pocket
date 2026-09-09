import { Compass } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/** Route-level 404 surface. */
export default function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="That route does not exist in the Purse dashboard."
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/">Back to overview</Link>
          </Button>
        }
      />
    </Card>
  );
}
