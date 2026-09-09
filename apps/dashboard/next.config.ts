import type { NextConfig } from 'next';

/** Next.js configuration for the Pocket dashboard. */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  // A self-contained server bundle, so the container image carries only the
  // files the server actually loads rather than the whole workspace, traced
  // from the workspace root because the hoisted store sits above this app.
  //
  // Off on Vercel. Vercel packages the build itself and reads the trace files
  // from where an ordinary build leaves them; standalone relocates those and
  // the build dies looking for next-server.js.nft.json. Both settings serve
  // the container and neither is wanted where the platform does the packaging.
  ...(process.env.VERCEL
    ? {}
    : {
        output: 'standalone' as const,
        outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
      }),
  experimental: {
    // Recharts ships a deep ESM tree; scoping the import keeps cold builds honest.
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
