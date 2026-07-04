import type { NextConfig } from 'next';

// NOTE: Serwist's webpack plugin is incompatible with Turbopack (Next.js 16 default).
// We use a static service worker at public/sw.js instead — no build-time precache,
// runtime caching only. This works with both Turbopack and OpenNext/Cloudflare.
// See: https://serwist.pages.dev/docs/next/turbo

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      // HTML pages — short cache so deploys propagate quickly
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
      // All routes — security & privacy headers
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Modern replacement for X-Frame-Options: DENY
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
