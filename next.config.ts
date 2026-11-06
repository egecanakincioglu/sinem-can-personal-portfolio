import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

export default function nextConfig(phase: string): NextConfig {
  return {
    // Route files named *.dev.tsx / *.dev.ts exist only in the development server, so production builds hold no panel or preview code.
    pageExtensions: phase === PHASE_DEVELOPMENT_SERVER ? ['dev.tsx', 'dev.ts', 'tsx', 'ts'] : ['tsx', 'ts'],
    // Brand-styled 404 for URLs no route matches (unknown/draft project slugs, wrong-language paths).
    experimental: { globalNotFound: true },
    async redirects() {
      // Root language: always Turkish. Browser-language detection is a later decision.
      return [{ source: '/', destination: '/tr', permanent: false }];
    },
  };
}
