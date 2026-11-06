import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Brand-styled 404 for URLs no route matches (unknown/draft project slugs, wrong-language paths).
  experimental: { globalNotFound: true },
  async redirects() {
    // Root language: always Turkish. Browser-language detection is a later decision.
    return [{ source: '/', destination: '/tr', permanent: false }];
  },
};

export default nextConfig;
