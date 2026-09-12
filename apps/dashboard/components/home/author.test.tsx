/**
 * The author badge and its written-out counterpart. What matters is that the
 * three profiles stay reachable: the badge keeps them out of the tab order
 * until it is opened, and the mobile list never hides them at all.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AuthorBadge, AuthorLinks } from './author';

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

describe('AuthorBadge', () => {
  const markup = renderToStaticMarkup(<AuthorBadge />);

  it('shows the avatar', () => {
    expect(markup).toContain('kartik.jpg');
    expect(markup).toContain('Kartik Mehta');
  });

  it('keeps the profiles closed until it is asked', () => {
    expect(markup).toContain('aria-expanded="false"');
    for (const profile of PROFILES) expect(markup).not.toContain(profile.href);
  });

  it('names the panel it controls', () => {
    expect(markup).toContain('aria-controls="author-profiles"');
  });
});

describe('AuthorLinks', () => {
  const markup = renderToStaticMarkup(<AuthorLinks />);

  it.each(PROFILES)('links to $label', ({ href }) => {
    expect(markup).toContain(`href="${href}"`);
  });

  it.each(PROFILES)('carries the $label mark', ({ logo }) => {
    expect(markup).toContain(logo);
  });

  it.each(PROFILES)('spells out $label rather than relying on the mark', ({ label }) => {
    expect(markup.replace(/<[^>]*>/g, ' ')).toContain(label);
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

  it('takes its placement from the caller', () => {
    expect(renderToStaticMarkup(<AuthorLinks className="mt-5" />)).toContain('class="mt-5"');
  });
});
