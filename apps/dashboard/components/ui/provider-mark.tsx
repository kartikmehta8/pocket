/**
 * A vendor's mark beside its name.
 */

import Image from 'next/image';

import { cn } from '@/lib/cn';

/** Props for {@link ProviderMark}. */
export interface ProviderMarkProps {
  /** Path under `public/logos`, or `null` for a vendor with no mark of its own. */
  src: string | null;
  /** Vendor name, always rendered as text beside the mark. */
  name: string;
  className?: string;
}

/**
 * A vendor's mark beside its name.
 *
 * @remarks The name is always rendered as text, never left to the image alone.
 * A logo the reader does not recognise carries nothing, and one that fails to
 * load carries less than that.
 *
 * A tint rather than the theme's black hairline: these sit inside a surface,
 * where an outline on every row competes with the structure around it.
 */
export function ProviderMark({ src, name, className }: ProviderMarkProps) {
  return (
    <span
      className={cn(
        'bg-ash-50 text-text-secondary inline-flex items-center gap-1.5',
        'rounded-full py-1 pr-2.5 pl-1.5 text-xs font-medium',
        className,
      )}
    >
      {src === null ? (
        <span aria-hidden className="bg-ash-300 size-1.5 shrink-0 rounded-full" />
      ) : (
        <Image
          src={src}
          alt=""
          width={16}
          height={16}
          unoptimized
          className="size-3.5 shrink-0 rounded-[3px] object-contain"
        />
      )}
      {name}
    </span>
  );
}
