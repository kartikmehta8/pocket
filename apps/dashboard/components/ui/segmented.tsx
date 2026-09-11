'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';

import { cn } from '@/lib/cn';

/** One option in a {@link Segmented} control. */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Props for {@link Segmented}. */
export interface SegmentedProps<T extends string> {
  /** Accessible name for the group. */
  label: string;
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onValueChange: (value: T) => void;
  className?: string;
  /**
   * Extra classes for each item, for a surface the theme's palette does not
   * suit — the blue agent header, for instance.
   */
  itemClassName?: string;
}

/**
 * Keyboard-operable segmented control for small, mutually exclusive choices.
 * Selecting is single-value and cannot be cleared — an empty change is ignored.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onValueChange,
  className,
  itemClassName,
}: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={label}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      className={cn(
        'bg-ash-50 ring-border inline-flex items-center gap-0.5 rounded-md p-0.5 ring-1 ring-inset',
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'text-text-secondary inline-flex cursor-pointer items-center rounded-sm px-2.5 py-1 text-xs font-medium',
            'hover:text-text transition-colors duration-(--duration-fast) ease-(--ease-brand)',
            'data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-e1',
            itemClassName,
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
