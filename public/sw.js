import {precacheAndRoute, cleanupOutdatedCaches} from 'workbox-precaching';
import {registerRoute, setCatchHandler} from 'workbox-routing';
import {NetworkFirst, CacheFirst, StaleWhileRevalidate, NetworkOnly} from 'workbox-strategies';
import {ExpirationPlugin} from 'workbox-expiration';

// Clean up old caches on activation
cleanupOutdatedCaches();

// Precache ALL build assets (HTML, JS, CSS, fonts, images, icons, static files)
precacheAndRoute(self.__WB_MANIFEST || []);

self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Take control of all pages immediately
    await self.clients.claim();
    console.log('Service Worker activated and claimed all clients');
    
    // Enable navigation preload for better performance
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
  })());
});

// 1. NAVIGATION FALLBACK: Always serve cached app shell for all routes
registerRoute(
  ({request}) => request.mode === 'navigate',
  async ({event}) => {
    try {
      // Try network first for fresh content
      const response = await fetch(event.request);
      return response;
    } catch (error) {
      // Network failed - serve cached app shell for ANY route
      console.log('Navigation request failed, serving cached app shell');
      const cachedResponse = await caches.match('/index.html');
      if (cachedResponse) {
        return cachedResponse;
      }
      // Fallback to root if index.html not found
      return await caches.match('/') || new Response('App offline', {status: 503});
    }
  }
);

// 2. STATIC ASSETS: Cache-first for all build assets
registerRoute(
  ({request}) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    request.destination === 'manifest',
  new CacheFirst({
    cacheName: 'static-assets-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// 3. API CALLS: Network-first with cache fallback for offline resilience
registerRoute(
  ({url}) => 
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.hostname.includes('supabase'),
  new NetworkFirst({
    cacheName: 'api-cache-v1',
    networkTimeoutSeconds: 3, // Fast timeout for better offline UX
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
      }),
    ],
  })
);

// 4. STATIC FILES: Cache common static files
registerRoute(
  ({url}) => 
    url.pathname.includes('/icons/') ||
    url.pathname.includes('/images/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/robots.txt' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico'),
  new CacheFirst({
    cacheName: 'static-files-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// 5. CONNECTIVITY PROBE: Always network-only (never cache)
registerRoute(
  ({url}) => url.pathname === '/ping.txt',
  new NetworkOnly()
);

// 6. FALLBACK HANDLER: Serve app shell for any failed document request
setCatchHandler(async ({event}) => {
  if (event.request?.destination === 'document') {
    console.log('Catch handler: serving app shell for failed document request');
    return await caches.match('/index.html') || await caches.match('/');
  }
  return Response.error();
});

// 7. MESSAGE HANDLING: For app-to-SW communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({version: '1.0.0'});
  }
});