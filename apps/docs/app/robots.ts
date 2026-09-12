import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/brand';

/**
 * What a crawler may index.
 *
 * @returns Rules allowing every page, and the address of the sitemap.
 * @remarks Everything here is public reference material; the only path worth
 * withholding is the search endpoint, which answers with an index rather than
 * a page and would otherwise be crawled as if it were one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
