'use client';

/**
 * The spend-category chooser inside the Policy panel.
 */

import { Check, ListChecks, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/cn';
import { CATEGORIES, categoryLabel } from '@/lib/catalog';
import type { Category } from '@/lib/types';

/** Props for {@link CategoryPicker}. */
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
/**
 * The categories an agent may spend on.
 *
 * @remarks Most policies allow most categories, so selecting eight things one
 * at a time was the first thing anyone complained about. "Select all" and
 * "Clear" sit with the group, and the count says what is chosen without
 * anyone counting pills.
 *
 * Each pill is a real checkbox with a visible focus ring, not a div listening
 * for clicks: the group is reachable by keyboard and announced as what it is.
 *
 * A policy is read back in contract order rather than click order, so what it
 * says does not depend on which pill was pressed first.
 */
export function CategoryPicker({ selected, onChange }: CategoryPickerProps) {
  const all = selected.length === CATEGORIES.length;
  const none = selected.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-text-muted text-xs">
          {none
            ? 'None selected, so every payment is refused.'
            : `${selected.length} of ${CATEGORIES.length} allowed`}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            icon={ListChecks}
            disabled={all}
            onClick={() => onChange([...CATEGORIES])}
          >
            Select all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            icon={X}
            disabled={none}
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        </div>
      </div>

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
                'focus-within:ring-accent-400 focus-within:ring-2',
                checked
                  ? 'bg-accent-50 text-accent-800 ring-accent-300'
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
                      : CATEGORIES.filter(
                          (entry) => entry === category || selected.includes(entry),
                        ),
                  )
                }
              />
              <Check
                aria-hidden
                className={cn('size-3 shrink-0', checked ? 'text-accent-600' : 'text-transparent')}
                strokeWidth={2.5}
              />
              {categoryLabel(category)}
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
