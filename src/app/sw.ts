import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      // Cache MCP API responses for offline viewing
      urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'rapidstats-api',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 86400 * 7, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // Cache external data.gov.my API calls (proxied through /api/ridership etc.)
      urlPattern: ({ url }: { url: URL }) =>
        url.hostname === 'api.data.gov.my',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'rapidstats-external',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 86400, // 1 day
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

serwist.addEventListeners();
