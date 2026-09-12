import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/brand';
import { source } from '@/lib/source';

/**
 * Every documentation page.
 *
 * @returns One entry per page in the tree, the landing page first.
 * @remarks Generated from the same source the sidebar is built from, so a page
 * cannot be added to the navigation and left out of the sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return source.getPages().map((page) => ({
    url: `${base}${page.url}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    // The landing page is the entry point; everything below it is equal.
    priority: page.url === '/docs' ? 1 : 0.7,
  }));
}
