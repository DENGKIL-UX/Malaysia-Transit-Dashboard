/// <reference lib="webworker" />
/**
 * RapidStats MY — Service Worker
 *
 * Static runtime-caching service worker. No build-time precache manifest
 * dependency — works with both Turbopack and OpenNext/Cloudflare.
 *
 * Cache strategy:
 *   - Navigation (HTML) → NetworkFirst, 1 hr stale
 *   - App shell assets (/_next/static/*, fonts) → CacheFirst, 30 days
 *   - Internal API (/api/*) → CacheFirst, 7 days
 *   - External data.gov.my → StaleWhileRevalidate, 1 day
 *   - Other → NetworkOnly
 */

const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'rapidstats-';

const CACHE_NAMES = {
  static: `${CACHE_PREFIX}static-${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}api-${CACHE_VERSION}`,
  external: `${CACHE_PREFIX}external-${CACHE_VERSION}`,
  pages: `${CACHE_PREFIX}pages-${CACHE_VERSION}`,
};

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then(() => {
      // Pre-populate the static cache shell (empty — assets cached on first visit)
    })
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  // Clean up old cache versions
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && !Object.values(CACHE_NAMES).includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Stale-while-revalidate: serve from cache if available, fetch in background and update cache.
 */
async function staleWhileRevalidate(request, cacheName, maxAgeSeconds = 86400, maxEntries = 50) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        trimCache(cacheName, maxEntries, maxAgeSeconds * 1000);
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

/**
 * Cache-first: serve from cache, only fetch on miss.
 */
async function cacheFirst(request, cacheName, maxAgeSeconds = 86400, maxEntries = 100) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cacheName, maxEntries, maxAgeSeconds * 1000);
    }
    return response;
  } catch {
    // Return a minimal offline response for API requests
    if (request.url.includes('/api/')) {
      return new Response(JSON.stringify({ offline: true, message: 'You are offline. Cached data may be stale.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 503,
      });
    }
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first with cache fallback for navigation requests.
 */
async function networkFirst(request, cacheName, maxAgeSeconds = 3600) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cacheName, 20, maxAgeSeconds * 1000);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Offline fallback: serve the cached index page for SPA navigation
    const fallback = await cache.match('/');
    if (fallback) return fallback;

    return new Response('Offline', { status: 503 });
  }
}

/**
 * Trim cache to stay within entry/age limits.
 */
async function trimCache(cacheName, maxEntries, maxAgeMs) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const now = Date.now();

  // Remove expired entries first
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const dateHeader = response.headers.get('date');
      if (dateHeader) {
        const age = now - new Date(dateHeader).getTime();
        if (age > maxAgeMs) {
          await cache.delete(key);
        }
      }
    }
  }

  // If still over limit, remove oldest entries
  const remaining = await cache.keys();
  if (remaining.length > maxEntries) {
    const toRemove = remaining.slice(0, remaining.length - maxEntries);
    await Promise.all(toRemove.map((key) => cache.delete(key)));
  }
}

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip non-GET and chrome-extension / devtools
  if (url.protocol === 'chrome-extension:' || url.protocol === 'devtools:') return;

  // 1. Static assets: Next.js bundles, fonts, images in public/
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp)$/)
  ) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static, 86400 * 30, 200));
    return;
  }

  // 2. Internal API routes — CacheFirst with 7-day TTL
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.api, 86400 * 7, 50));
    return;
  }

  // 3. External data.gov.my API — StaleWhileRevalidate
  if (url.hostname === 'api.data.gov.my') {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.external, 86400, 30));
    return;
  }

  // 4. HTML / navigation — NetworkFirst
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(request, CACHE_NAMES.pages, 3600));
    return;
  }

  // 5. Everything else — try network, pass through
  event.respondWith(
    fetch(request).catch(() => new Response('Offline', { status: 503 }))
  );
});

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Online event: reload pages that were shown offline ───────────────────────
self.addEventListener('online', () => {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => client.navigate(client.url));
  });
});
