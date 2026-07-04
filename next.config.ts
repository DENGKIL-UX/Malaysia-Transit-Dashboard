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
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
