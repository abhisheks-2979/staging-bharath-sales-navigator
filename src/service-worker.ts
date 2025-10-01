/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[];
};

interface PrecacheEntry {
  url: string;
  revision?: string;
}
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Version runtime caches to force fresh data after deploys
const RUNTIME_CACHE_VERSION = 'v2';

// Workbox will replace this with the list of files to precache.
precacheAndRoute(self.__WB_MANIFEST);

// Immediately activate updated service worker and allow manual skip-waiting
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('message', (event) => {
  if (event.data && (event.data === 'SKIP_WAITING' || event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});
// Clear old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions and unversioned caches
          if (
            cacheName === 'api-cache' ||
            cacheName === 'images-cache' ||
            cacheName === 'dynamic-cache' ||
            cacheName.startsWith('api-cache-') ||
            cacheName.startsWith('images-cache-') ||
            cacheName.startsWith('dynamic-cache-')
          ) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fallback to index.html for SPA routes
registerRoute(
  ({ request }) => request.mode === 'navigate',
  createHandlerBoundToURL('/index.html')
);

// Runtime caching: Supabase API - Use NetworkFirst with short cache for fresh data
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({
    cacheName: `api-cache-${RUNTIME_CACHE_VERSION}`,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5, // 5 minutes only for API responses
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// Runtime caching: images - Use NetworkFirst for better updates
registerRoute(
  ({ request }) => request.destination === 'image',
  new NetworkFirst({
    cacheName: `images-cache-${RUNTIME_CACHE_VERSION}`,
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 1 day for images
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// Skip caching for dynamic routes and API endpoints that should always be fresh
registerRoute(
  ({ url, request }) => {
    return (
      request.method === 'POST' ||
      request.method === 'PUT' ||
      request.method === 'DELETE' ||
      url.pathname.includes('/api/') ||
      url.pathname.includes('/functions/')
    );
  },
  new NetworkFirst({
    cacheName: `dynamic-cache-${RUNTIME_CACHE_VERSION}`,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60, // 1 minute for dynamic content
        purgeOnQuotaError: true,
      }),
    ],
  })
);
