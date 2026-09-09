import { Wordmark } from './wordmark';
import { AdapterHealth } from './adapter-health';
import { Nav } from './nav';

/**
 * Persistent left rail: wordmark, primary navigation, and live adapter health.
 * Fixed on wide viewports; collapses to a plain header band below `lg`.
 */
export function Sidebar() {
  return (
    <aside className="border-border bg-surface flex shrink-0 flex-col border-b lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:overflow-y-auto lg:border-r lg:border-b-0">
      <div className="px-5 py-5">
        <Wordmark tagline />
      </div>
      <Nav />
      <div className="mt-auto">
        <AdapterHealth />
      </div>
    </aside>
  );
}
