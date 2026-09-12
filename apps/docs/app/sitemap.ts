/**
 * The sitemap, generated from the page tree.
 */

import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/brand';
import { source } from '@/lib/source';

/**
 * Every documentation page.
 *
 * @returns One entry per page in the tree, the landing page first.
 * @remarks Generated from the same source the sidebar is built from, so a page
 * cannot be added to the navigation and left out of the sitemap. The landing
 * page is the entry point and ranks above the rest; everything below it is
 * equal.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return source.getPages().map((page) => ({
    url: `${base}${page.url}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: page.url === '/docs' ? 1 : 0.7,
  }));
}
