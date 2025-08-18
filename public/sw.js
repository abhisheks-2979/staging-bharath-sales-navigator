import {precacheAndRoute, cleanupOutdatedCaches} from 'workbox-precaching';
import {registerRoute, setCatchHandler} from 'workbox-routing';
import {NetworkOnly, CacheFirst} from 'workbox-strategies';

// Clean up old caches
cleanupOutdatedCaches();

// Precache all assets defined by __WB_MANIFEST (injected by Vite PWA)
precacheAndRoute(self.__WB_MANIFEST || []);

self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Claim clients immediately.
    await self.clients.claim();
    // Enable navigation preload if available.
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
  })());
});

// Handle navigation requests (SPA routing)
registerRoute(
  ({request}) => request.mode === 'navigate',
  async ({event}) => {
    // Use any preloaded response.
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;

    try {
      // Try network first (when online).
      return await fetch(event.request);
    } catch {
      // Fallback to cached app shell - serve index.html for all routes
      return await caches.match('/index.html') || await caches.match('/');
    }
  }
);

// Cache static assets with cache-first strategy
registerRoute(
  ({request}) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new CacheFirst({
    cacheName: 'static-assets',
  })
);

// Do NOT cache the connectivity probe - always go to network
registerRoute(
  ({url}) => url.pathname === '/ping.txt',
  new NetworkOnly()
);

// Generic catch handler: serve app shell for any document request that fails
setCatchHandler(async ({event}) => {
  if (event.request?.destination === 'document') {
    return await caches.match('/index.html') || await caches.match('/');
  }
  return Response.error();
});