import {precacheAndRoute, createHandlerBoundToURL} from 'workbox-precaching';
import {registerRoute, setCatchHandler} from 'workbox-routing';
import {NetworkOnly} from 'workbox-strategies';

// Injected at build: self.__WB_MANIFEST
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

// 1) For navigations, try network first (with navigation preload), then fall back to the app shell.
registerRoute(
  ({request}) => request.mode === 'navigate',
  async ({event}) => {
    // Use any preloaded response.
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;

    try {
      // Try network (when online).
      return await fetch(event.request);
    } catch {
      // Fallback to cached app shell (serve '/' or '/index.html' depending on your build).
      // If your build precaches '/index.html', use that. Otherwise use '/'.
      return await caches.match('/index.html') || await caches.match('/');
    }
  }
);

// 2) Do NOT cache the connectivity probe.
registerRoute(
  ({url}) => url.pathname === '/ping.txt',
  new NetworkOnly()
);

// 3) Generic catch: if anything fails for a document, show the app shell instead of an offline page.
setCatchHandler(async ({event}) => {
  if (event.request?.destination === 'document') {
    return await caches.match('/index.html') || await caches.match('/');
  }
  return Response.error();
});