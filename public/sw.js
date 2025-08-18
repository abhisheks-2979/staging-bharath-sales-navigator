import {precacheAndRoute, cleanupOutdatedCaches} from 'workbox-precaching';
import {registerRoute, setCatchHandler} from 'workbox-routing';
import {NetworkOnly, CacheFirst, StaleWhileRevalidate} from 'workbox-strategies';
import {ExpirationPlugin} from 'workbox-expiration';

// Clean up old caches on activation
cleanupOutdatedCaches();

// Precache all critical app files (injected by Vite PWA)
precacheAndRoute(self.__WB_MANIFEST || []);

self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Take control of all pages immediately
    await self.clients.claim();
    // Enable navigation preload for better performance
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
  })());
});

// Serve all navigation requests from cache if offline
registerRoute(
  ({request}) => request.mode === 'navigate',
  async ({event}) => {
    try {
      return await fetch(event.request); // online attempt
    } catch {
      return await caches.match('/index.html'); // always fallback to cached app shell
    }
  }
);

// Cache static assets (JS, CSS, fonts, images) with cache-first strategy
registerRoute(
  ({request}) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker' ||
    request.destination === 'font' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// API calls: Network first, cache as backup
registerRoute(
  ({url}) => url.pathname.startsWith('/api/') || url.pathname.includes('/rest/v1/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// Connectivity probe: Always network-only
registerRoute(
  ({url}) => url.pathname === '/ping.txt',
  new NetworkOnly()
);

// Fallback handler: serve app shell for any failed document request
setCatchHandler(async ({event}) => {
  if (event.request?.destination === 'document') {
    return await caches.match('/index.html') || await caches.match('/');
  }
  return Response.error();
});