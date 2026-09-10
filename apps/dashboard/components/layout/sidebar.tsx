import { cn } from '@/lib/cn';
import { Rail } from './rail';

/**
 * The fixed left rail, on viewports wide enough to spare the width.
 *
 * Hidden below `lg`, where the same content is reached through the drawer in
 * the top bar instead.
 */
export function Sidebar() {
  return (
    <aside
      className={cn(
        'border-border bg-surface hidden shrink-0 flex-col',
        'lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:border-r',
      )}
    >
      <Rail idPrefix="rail" />
    </aside>
  );
}
