const CACHE_NAME = 'bharath-sales-navigator-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx',
  '/src/App.css',
  
  // Icons
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  
  // Key pages for offline access
  '/src/pages/Index.tsx',
  '/src/pages/MyVisits.tsx',
  '/src/pages/VisitPlanner.tsx',
  '/src/pages/Analytics.tsx',
  '/src/pages/TodaySummary.tsx',
  '/src/pages/Attendance.tsx',
  '/src/pages/Performance.tsx',
  '/src/pages/OrderEntry.tsx',
  '/src/pages/Cart.tsx',
  
  // Core components
  '/src/components/Layout.tsx',
  '/src/components/Navbar.tsx',
  '/src/components/VisitCard.tsx',
  '/src/components/RetailerAnalytics.tsx',
  
  // UI components (essential ones)
  '/src/components/ui/button.tsx',
  '/src/components/ui/card.tsx',
  '/src/components/ui/input.tsx',
  '/src/components/ui/dialog.tsx',
  '/src/components/ui/toast.tsx',
  '/src/components/ui/tabs.tsx',
  
  // Utils and config
  '/src/lib/utils.ts',
  '/src/integrations/supabase/client.ts',
  
  // Static assets
  '/public/placeholder.svg',
  '/public/favicon.ico'
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
            '/manifest.json',
            '/icons/icon-192.png',
            '/icons/icon-512.png'
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
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache new resources (for dynamic caching)
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, show offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});