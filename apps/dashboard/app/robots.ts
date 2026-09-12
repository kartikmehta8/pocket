import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/brand';

/**
 * What a crawler may index.
 *
 * @returns Rules allowing the marketing page and nothing behind the session.
 * @remarks Every signed-in route redirects a stranger to sign-in, so a crawler
 * would only ever index the same login screen a dozen times over. Saying so
 * here keeps those URLs out of results without relying on the redirect.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/login',
        '/dashboard',
        '/agents',
        '/payments',
        '/audit',
        '/marketplace',
        '/capabilities',
        '/settings',
        '/setup',
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
