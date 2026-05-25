---
Task ID: 1
Agent: Main
Task: Fix Serwist + Turbopack build conflict for CF Pages deployment

Work Log:
- Read next.config.ts — found `withSerwist` wrapper injecting webpack plugin
- Identified root cause: Next.js 16 defaults to Turbopack, Serwist webpack plugin conflicts
- Removed `withSerwistInit` import and wrapper from next.config.ts
- Created static `public/sw.js` with runtime caching (no build-time precache dependency):
  - Static assets (_next/static/*) → CacheFirst, 30-day TTL, max 200 entries
  - Internal API (/api/*) → CacheFirst, 7-day TTL, max 50 entries
  - External data.gov.my → StaleWhileRevalidate, 1-day TTL, max 30 entries
  - Navigation → NetworkFirst with offline fallback
  - Online event → auto-reload pages
- Fixed mismatched quote in layout.tsx Geist_Mono import (`'next/font/google"` → `'next/font/google'`)
- Fixed offline-banner.tsx lint error: `useState(false)` + `setIsOffline(!navigator.onLine)` → `useState(() => !navigator.onLine)`
- Added `.open-next` to ESLint ignores
- Lint passes clean
- Pushed commit 8021c71 to GitHub origin/main

Stage Summary:
- Build will no longer fail with Turbopack/webpack conflict
- Service worker works as a static file served from public/ — no webpack plugin needed
- Serwist packages still in dependencies but not used for build-time SW generation
- CF Pages should now deploy successfully
