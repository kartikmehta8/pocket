/**
 * How spend divides across what agents bought. Rows are ordered largest first
 * whatever order the API returned them in, and a category with a share too
 * small to paint still gets its row.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { SpendSummary } from '@/lib/types';

import { CategorySplit } from './category-split';

/** Strips tags so visible text can be matched. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

const BY_CATEGORY: SpendSummary['byCategory'] = [
  { category: 'data', amount: '1.00', count: 2 },
  { category: 'research', amount: '3.00', count: 5 },
];

describe('CategorySplit', () => {
  it('ranks by spend and states each share of the total', () => {
    const html = renderToStaticMarkup(<CategorySplit byCategory={BY_CATEGORY} asset="USDC" />);
    const rendered = text(html);

    expect(rendered.indexOf('Research')).toBeLessThan(rendered.indexOf('Data'));
    expect(rendered).toContain('75% of spend');
    expect(rendered).toContain('25% of spend');
    expect(rendered).toContain('3.00 USDC');
    expect(rendered).toContain('5 payments');
    expect(rendered).toContain('2 payments');
  });

  it('leaves a category with no spend out of the bar but keeps it in the list', () => {
    const html = renderToStaticMarkup(
      <CategorySplit
        byCategory={[
          { category: 'research', amount: '2.00', count: 1 },
          { category: 'data', amount: '0', count: 0 },
        ]}
        asset="USDC"
      />,
    );
    expect(html.match(/width:/g)).toHaveLength(1);
    expect(text(html)).toContain('0% of spend');
    expect(text(html)).toContain('1 payment ');
  });

  it('divides by nothing safely when the window recorded no spend', () => {
    const html = renderToStaticMarkup(
      <CategorySplit byCategory={[{ category: 'data', amount: '0', count: 0 }]} asset="USDC" />,
    );
    expect(text(html)).toContain('0% of spend');
    expect(html).not.toContain('NaN');
  });
});
