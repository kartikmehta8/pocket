/**
 * Small typographic marks the marketing page reuses.
 */

import Image from 'next/image';

import { cn } from '@/lib/cn';

/**
 * An amount with the currency it is denominated in.
 *
 * Naming the currency is not decoration. Every figure on this page is
 * stablecoin, and a bare `0.75` beside a dollar figure elsewhere would be the
 * kind of ambiguity a payments product cannot afford. Whether it says so with
 * the mark or the ticker is a density question: the mark leads a heading, the
 * ticker trails a figure in a row of other figures.
 *
 * @param value Decimal string, already formatted.
 * @param className Extra classes for the wrapper.
 * @param as `mark` for the coin logo, `ticker` for the letters USDC.
 */
export function Money({
  value,
  className,
  as = 'mark',
}: {
  value: string;
  className?: string;
  as?: 'mark' | 'ticker';
}) {
  if (as === 'ticker') {
    return (
      <span className={cn('whitespace-nowrap', className)}>
        <span className="figures">{value}</span>
        <span className="ml-1 text-[0.75em] font-medium opacity-60">USDC</span>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap', className)}>
      <Image
        src="/logos/usdc.svg"
        alt="USDC"
        width={16}
        height={16}
        unoptimized
        className="size-[0.95em] shrink-0"
      />
      <span className="figures">{value}</span>
    </span>
  );
}

/** Where a piece of data actually came from. */
export interface Source {
  name: string;
  logo: string;
}

/**
 * A data provider's name behind its own mark.
 *
 * @param source The provider.
 */
export function SourceMark({ source }: { source: Source }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="bg-surface ring-border/15 flex size-3.5 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1">
        <Image
          src={source.logo}
          alt=""
          width={16}
          height={16}
          unoptimized
          className="size-full object-contain"
        />
      </span>
      {source.name}
    </span>
  );
}
