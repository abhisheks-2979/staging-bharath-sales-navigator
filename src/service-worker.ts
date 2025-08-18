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

// Workbox will replace this with the list of files to precache.
precacheAndRoute(self.__WB_MANIFEST);

// Fallback to index.html for SPA routes
registerRoute(
  ({ request }) => request.mode === 'navigate',
  createHandlerBoundToURL('/index.html')
);

// Runtime caching: Supabase API
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
      }),
    ],
  }),
);

// Runtime caching: images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  }),
);
