import type { NextConfig } from 'next';

// NOTE: Serwist's webpack plugin is incompatible with Turbopack (Next.js 16 default).
// We use a static service worker at public/sw.js instead — no build-time precache,
// runtime caching only. This works with both Turbopack and OpenNext/Cloudflare.
// See: https://serwist.pages.dev/docs/next/turbo

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
