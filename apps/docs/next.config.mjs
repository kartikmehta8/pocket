import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Ships only the files the server actually loads, so the image carries a
  // runtime rather than the whole workspace. Matches the dashboard.
  output: 'standalone',
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  // Next writes AGENTS.md and CLAUDE.md into the app root on boot. This repo
  // keeps its guidance in one place, so the generated pair is turned off
  // rather than committed and left to drift.
  agentRules: false,
};

export default withMDX(config);
