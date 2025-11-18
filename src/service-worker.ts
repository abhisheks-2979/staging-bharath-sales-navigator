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
// INCREMENT THIS VERSION TO FORCE COMPLETE CACHE REFRESH
const RUNTIME_CACHE_VERSION = 'v9';
const PRECACHE_VERSION = 'v9';

// Workbox will replace this with the list of files to precache.
precacheAndRoute(self.__WB_MANIFEST);

// No need to precache offline.html - we'll serve the app instead

// Immediately activate updated service worker and allow manual skip-waiting
self.addEventListener('install', () => {
  console.log('🔧 Installing service worker version:', RUNTIME_CACHE_VERSION);
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data === 'SKIP_WAITING' || event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
  
  // Handle force clear request
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then(names => {
        console.log('🗑️ Force clearing all caches...');
        return Promise.all(names.map(name => caches.delete(name)));
      })
    );
  }
});
// AGGRESSIVE cache cleanup on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const currentCaches = [
        `api-cache-${RUNTIME_CACHE_VERSION}`,
        `images-cache-${RUNTIME_CACHE_VERSION}`,
        `dynamic-cache-${RUNTIME_CACHE_VERSION}`,
        `navigation-cache-${RUNTIME_CACHE_VERSION}`,
      ];
      
      // Delete ALL caches that don't match current version
      const deletionPromises = cacheNames
        .filter(name => {
          // Keep only caches with current version
          return !currentCaches.includes(name) && 
                 !name.includes(`workbox-precache-${PRECACHE_VERSION}`);
        })
        .map(name => {
          console.log('🗑️ Deleting old cache:', name);
          return caches.delete(name);
        });
      
      await Promise.all(deletionPromises);
      
      // Take control immediately
      await self.clients.claim();
      
      // Notify all clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'CACHE_UPDATED', version: RUNTIME_CACHE_VERSION });
      });
      
      console.log('✅ Service worker activated with version:', RUNTIME_CACHE_VERSION);
    })()
  );
});

// Fallback to index.html for SPA routes - always serve app when offline
registerRoute(
  ({ request }) => request.mode === 'navigate',
  // Always return the precached app shell for SPA routes (robust offline support)
  createHandlerBoundToURL('/index.html')
);

// Runtime caching: Supabase API - Use NetworkFirst with very short cache
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({
    cacheName: `api-cache-${RUNTIME_CACHE_VERSION}`,
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 2, // 2 minutes only for API responses
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// Runtime caching: images - Use NetworkFirst with shorter cache
registerRoute(
  ({ request }) => request.destination === 'image',
  new NetworkFirst({
    cacheName: `images-cache-${RUNTIME_CACHE_VERSION}`,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 2, // 2 hours for images
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
