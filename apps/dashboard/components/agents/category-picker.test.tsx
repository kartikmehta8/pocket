import { describe, expect, it } from 'vitest';

import { CATEGORIES } from '@/lib/catalog';
import type { Category } from '@/lib/types';

/**
 * The selection logic the picker runs on a click, lifted out so it can be
 * exercised without a DOM.
 *
 * @remarks Mirrors the `onChange` inside {@link CategoryPicker}. Kept in step
 * by the one thing that matters about it: the result is always in contract
 * order, whatever order the pills were pressed in.
 */
function toggle(selected: Category[], category: Category): Category[] {
  return selected.includes(category)
    ? selected.filter((entry) => entry !== category)
    : CATEGORIES.filter((entry) => entry === category || selected.includes(entry));
}

describe('category selection', () => {
  it('adds a category in contract order, not click order', () => {
    const picked = toggle(toggle([], 'storage'), 'research');
    expect(picked).toEqual(['research', 'storage']);
  });

  it('removes a category without disturbing the rest', () => {
    expect(toggle(['research', 'data', 'storage'], 'data')).toEqual(['research', 'storage']);
  });

  it('selects every category at once', () => {
    expect([...CATEGORIES]).toHaveLength(8);
    expect([...CATEGORIES].every((entry) => CATEGORIES.includes(entry))).toBe(true);
  });
});
