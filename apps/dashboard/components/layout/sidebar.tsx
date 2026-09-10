import { POWERED_BY } from '@/lib/brand';
import { cn } from '@/lib/cn';
import { Wordmark } from './wordmark';
import { AdapterHealth } from './adapter-health';
import { Nav } from './nav';

/**
 * Persistent left rail: wordmark, primary navigation, and live adapter health.
 *
 * Fixed on wide viewports; collapses to a plain header band below `lg`.
 *
 * The navigation takes the slack and scrolls inside it, so the adapter
 * disclosure stays pinned to the bottom and opening it pushes nothing off
 * screen. `min-h-0` is what lets that column shrink below its content: a flex
 * child defaults to its content height and would otherwise overflow the rail
 * rather than scroll inside it.
 */
export function Sidebar() {
  return (
    <aside
      className={cn(
        'border-border bg-surface flex shrink-0 flex-col border-b',
        'lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:border-r lg:border-b-0',
      )}
    >
      <div className="px-5 pt-5 pb-6">
        <Wordmark />
        <p className="text-text-muted mt-1.5 flex items-center gap-1.5 text-xs leading-snug">
          <span aria-hidden className="bg-accent-400 size-1 rounded-full" />
          {POWERED_BY}
        </p>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-4">
        <Nav />
      </div>

      <AdapterHealth />
    </aside>
  );
}
