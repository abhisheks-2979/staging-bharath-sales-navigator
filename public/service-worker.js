const CACHE_NAME = 'bharath-sales-navigator-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
        // Cache essential files only if full cache fails
        return caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll([
            '/',
            '/index.html',
            '/manifest.json'
          ]);
        });
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip caching POST requests and external APIs
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return cached version
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        
        // Network fetch with caching
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses or non-basic responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response before caching
          const responseToCache = response.clone();
          
          // Cache new resources (dynamic caching for JS, CSS, images)
          const url = event.request.url;
          const shouldCache = url.includes('/assets/') || 
                             url.endsWith('.js') || 
                             url.endsWith('.css') || 
                             url.endsWith('.png') || 
                             url.endsWith('.jpg') || 
                             url.endsWith('.svg') ||
                             url.endsWith('.woff2') ||
                             url === self.location.origin + '/';
          
          if (shouldCache) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('Caching:', url);
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.error('Failed to cache:', url, error);
              });
          }
          
          return response;
        });
      })
      .catch((error) => {
        console.log('Fetch failed, serving from cache:', error);
        
        // If both cache and network fail, serve offline fallbacks
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        
        // For images, you could return a default offline image
        if (event.request.destination === 'image') {
          return caches.match('/icons/icon-192.png');
        }
        
        throw error;
      })
  );
});