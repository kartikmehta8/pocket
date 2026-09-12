/**
 * Everything the left rail contains, shared by the fixed copy and the drawer.
 */

import { POWERED_BY } from '@/lib/brand';
import { Wordmark } from './wordmark';
import { AdapterHealth } from './adapter-health';
import { Nav } from './nav';

/**
 * Everything the left rail contains: wordmark, navigation, adapter health.
 *
 * Shared by the fixed desktop rail and the mobile drawer so the two cannot
 * drift apart. A phone gets the same rail behind a toggle, not a reduced
 * version of it.
 *
 * @param idPrefix Distinguishes this copy's element ids from the other's.
 *   Both copies exist in the document at once, so neither can generate them.
 */
export function Rail({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <div className="px-5 pt-5 pb-6">
        <Wordmark />
        <p className="text-text-muted mt-1.5 flex items-center gap-1.5 text-xs leading-snug">
          <span aria-hidden className="bg-accent-400 size-1 rounded-full" />
          {POWERED_BY}
        </p>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-4">
        <Nav idPrefix={idPrefix} />
      </div>

      <AdapterHealth id={`${idPrefix}-adapters`} />
    </>
  );
}
