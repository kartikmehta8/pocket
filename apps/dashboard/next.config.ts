/**
 * Next configuration for the dashboard.
 */

import type { NextConfig } from 'next';

/**
 * Hosts a server action may be submitted from.
 *
 * Vercel serves the site on one canonical host and 308-redirects the other.
 * A form POST follows that redirect but keeps the `Origin` of the page it came
 * from, so the action arrives with a host that does not match its origin and
 * Next rejects it as forged. Naming both spellings of the domain lets the
 * redirected POST through while still refusing genuinely foreign origins.
 *
 * @returns The apex and `www` forms of the public domain, plus the
 *   per-deployment URL Vercel injects for preview builds.
 */
function allowedOrigins(): string[] {
  const apex = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'pocket-app.xyz')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
  const deployment = process.env.VERCEL_URL;
  return [
    apex,
    `www.${apex}`,
    ...(deployment === undefined || deployment === '' ? [] : [deployment]),
  ];
}

/**
 * Next.js configuration for the Pocket dashboard.
 *
 * @remarks A self-contained server bundle, so the container image carries only
 * the files the server actually loads rather than the whole workspace, traced
 * from the workspace root because the hoisted store sits above this app. Off on
 * Vercel. Vercel packages the build itself and reads the trace files from where
 * an ordinary build leaves them; standalone relocates those and the build dies
 * looking for next-server.js.nft.json. Both settings serve the container and
 * neither is wanted where the platform does the packaging.
 *
 * Recharts ships a deep ESM tree; scoping the import keeps cold builds honest.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  ...(process.env.VERCEL
    ? {}
    : {
        output: 'standalone' as const,
        outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
      }),
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    serverActions: { allowedOrigins: allowedOrigins() },
  },
};

export default nextConfig;
