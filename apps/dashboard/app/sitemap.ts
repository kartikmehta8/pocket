import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/brand';

/**
 * The pages worth crawling.
 *
 * @returns One entry: the marketing page. Everything else on this deployment
 *   needs a session, and a sitemap listing pages that answer with a redirect
 *   is a sitemap that teaches a crawler to distrust it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl()}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
