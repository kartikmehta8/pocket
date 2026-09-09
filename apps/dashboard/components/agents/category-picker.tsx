'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';
import { CATEGORIES, categoryLabel } from '@/lib/catalog';
import type { Category } from '@/lib/types';

/** Props for {@link CategoryPicker}. */
export interface CategoryPickerProps {
  selected: Category[];
  onChange: (next: Category[]) => void;
}

/**
 * Checkbox group over the eight contract categories. Each option is a real
 * `<input type="checkbox">` so it stays keyboard- and screen-reader-operable;
 * the chip is the visual layer on top.
 */
export function CategoryPicker({ selected, onChange }: CategoryPickerProps) {
  return (
    <fieldset className="flex flex-wrap gap-1.5">
      <legend className="sr-only">Allowed categories</legend>
      {CATEGORIES.map((category) => {
        const checked = selected.includes(category);
        return (
          <label
            key={category}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
              'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
              'focus-within:outline-accent-500 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2',
              checked
                ? 'bg-accent-50 text-accent-800 ring-accent-200'
                : 'bg-surface text-text-secondary ring-border hover:bg-ash-25',
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={() =>
                onChange(
                  checked
                    ? selected.filter((entry) => entry !== category)
                    : [...selected, category],
                )
              }
            />
            <Check
              aria-hidden
              className={cn('size-3', checked ? 'text-accent-600' : 'text-transparent')}
              strokeWidth={2.5}
            />
            {categoryLabel(category)}
          </label>
        );
      })}
    </fieldset>
  );
}
