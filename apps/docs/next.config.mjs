import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Standalone ships only the files the server actually loads, so the Docker
  // image carries a runtime rather than the whole workspace.
  //
  // Off on Vercel. Vercel builds its own bundle and reads the trace files from
  // where an ordinary build leaves them; standalone relocates those, and the
  // build fails looking for next-server.js.nft.json. Both settings exist for
  // the container and neither is wanted on a platform that does its own
  // packaging.
  ...(process.env.VERCEL
    ? {}
    : {
        output: 'standalone',
        outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
      }),
  // Next writes AGENTS.md and CLAUDE.md into the app root on boot. This repo
  // keeps its guidance in one place, so the generated pair is turned off
  // rather than committed and left to drift.
  agentRules: false,
};

export default withMDX(config);
