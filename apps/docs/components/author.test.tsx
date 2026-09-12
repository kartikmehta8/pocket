/**
 * The author block in the sidebar footer. It exists to send a reader somewhere
 * off-site, so what matters is that all three destinations are present, named,
 * and safe to open.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SidebarAuthor } from './author';

/** Every profile, and the mark each one is expected to carry. */
const PROFILES = [
  { label: 'Website', href: 'https://www.mrmehta.in/', logo: '/logos/website.svg' },
  { label: 'X', href: 'https://x.com/kartik_mehta8', logo: '/logos/x.svg' },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/kartikmehta17',
    logo: '/logos/linkedin.svg',
  },
];

describe('SidebarAuthor', () => {
  const markup = renderToStaticMarkup(<SidebarAuthor />);

  it('names the author beside the avatar', () => {
    expect(markup).toContain('kartik.jpg');
    expect(markup).toContain('Kartik Mehta');
  });

  it.each(PROFILES)('links to $label', ({ href }) => {
    expect(markup).toContain(`href="${href}"`);
  });

  it.each(PROFILES)('carries the $label mark', ({ logo }) => {
    expect(markup).toContain(logo);
  });

  it.each(PROFILES)('gives $label a name a screen reader can read', ({ label }) => {
    expect(markup).toContain(`Kartik Mehta on ${label}`);
  });

  it('warns that each link leaves the page', () => {
    expect(markup.match(/opens in a new tab/g)).toHaveLength(PROFILES.length);
  });

  it('opens every profile in a new tab, without leaking the referrer', () => {
    const links = markup.match(/<a [^>]*>/g) ?? [];
    expect(links).toHaveLength(PROFILES.length);
    for (const link of links) {
      expect(link).toContain('target="_blank"');
      expect(link).toContain('noreferrer');
      expect(link).toContain('noopener');
    }
  });

  it('drops its rule in the drawer, which has an edge of its own', () => {
    expect(markup).toContain('max-md:border-t-0');
    expect(markup).toContain('data-pocket-author');
  });
});
