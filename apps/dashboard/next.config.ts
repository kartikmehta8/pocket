import type { NextConfig } from 'next';

/** Next.js configuration for the Purse dashboard. */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  // Emit a self-contained server bundle, so the container image carries only
  // the files the server actually loads rather than the whole workspace.
  output: 'standalone',
  // The dashboard lives inside a pnpm workspace; without this Next traces
  // dependencies from the app directory and misses the hoisted store.
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  experimental: {
    // Recharts ships a deep ESM tree; scoping the import keeps cold builds honest.
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
