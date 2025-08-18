/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Workbox will replace this with the list of files to precache.
precacheAndRoute(self.__WB_MANIFEST);

// Cache all navigation requests (SPA app shell)
const appShellHandler = new NetworkFirst({
  cacheName: 'app-shell',
  networkTimeoutSeconds: 3,
});
const navigationRoute = new NavigationRoute(appShellHandler);
registerRoute(navigationRoute);

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
