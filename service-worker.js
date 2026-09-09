const CACHE_NAME = 'grocery-management-v7';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'customers.html',
  'customer-details.html',
  'stock.html',
  'product-details.html',
  'sales.html',
  'dues.html',
  'notifications.html',
  'settings.html',
  
  'css/style.css',
  'css/dashboard.css',
  'css/customers.css',
  'css/stock.css',
  'css/responsive.css',
  
  'js/app.js',
  'js/storage.js',
  'js/utils.js',
  'js/notifications.js',
  'js/customers.js',
  'js/stock.js',
  'js/sales.js',
  'js/dues.js',
  'js/settings.js',
  
  'manifest.json',
  'favicon.ico',
  'favicon.png',
  'images/favicon.png',
  'images/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png'
];

// Install Service Worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching App Shell assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event (clean up old caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event (Network First falling back to Cache for instant updates during development)
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Cache new fetch requests dynamically
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Offline fallback - serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          console.log('[Service Worker] Resource offline fetch failed and not cached:', event.request.url);
        });
      })
  );
});
