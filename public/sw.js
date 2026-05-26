/**
 * Minimal service worker — pass-through only.
 *
 * Chrome Android requires a registered SW with a fetch handler to show the
 * "Add to Home Screen" install prompt. This SW does NO caching — CF Worker
 * handles all caching via Cache-Control headers. The sole purpose is to
 * satisfy Chrome's installability criteria.
 *
 * iOS Safari does NOT require a service worker for A2HS.
 */

const SW_VERSION = 'v2';

self.addEventListener('install', () => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up any old SW caches (from the previous caching SW)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('rapidstats-'))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Minimal fetch handler — Chrome checks for this during installability audit
self.addEventListener('fetch', (event) => {
  // Let all requests pass through to the network / CF Worker
  // No interception, no caching — pure passthrough
});
