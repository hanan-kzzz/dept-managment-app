const CACHE_NAME = 'cashly-pwa-v1.0';

const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'favicon.ico',
  'favicon.png',
  'images/favicon.png',
  'images/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  
  // HTML Pages
  'pages/customers/customers.html',
  'pages/customers/customer-details.html',
  'pages/inventory/stock.html',
  'pages/inventory/product-details.html',
  'pages/inventory/barcode-management.html',
  'pages/inventory/market-prices.html',
  'pages/sales/sales.html',
  'pages/sales/new-sale.html',
  'pages/sales/dues.html',
  'pages/settings/settings.html',
  'pages/settings/notifications.html',
  'pages/settings/about/index.html',
  'pages/settings/appearance/index.html',
  'pages/settings/backup/index.html',
  'pages/settings/bill-settings/index.html',
  'pages/settings/business-details/index.html',
  'pages/settings/currency/index.html',
  'pages/settings/language/index.html',
  'pages/settings/notifications/index.html',
  'pages/settings/shop-profile/index.html',
  'pages/settings/telegram/index.html',
  'pages/settings/whatsapp/index.html',
  
  // Auth Pages
  'auth/login.html',
  'auth/signup.html',
  'auth/welcome.html',
  'auth/forgot-password.html',
  'auth/reset-password.html',
  'auth/otp-verification.html',
  
  // CSS Files
  'css/style.css',
  'css/dashboard.css',
  'css/customers.css',
  'css/stock.css',
  'css/responsive.css',
  'css/auth.css',
  'css/market-prices.css',
  'css/settings.css',
  
  // JS Files
  'js/app.js',
  'js/storage.js',
  'js/utils.js',
  'js/pwa.js',
  'js/loader.js',
  'js/notifications.js',
  'js/customers.js',
  'js/customer-details.js',
  'js/stock.js',
  'js/product-details.js',
  'js/sales.js',
  'js/new-sale.js',
  'js/dues.js',
  'js/settings.js',
  'js/barcode.js',
  'js/barcode-management.js',
  'js/scanner.js',
  'js/market-prices.js',
  'js/marketPriceService.js'
];

// Install Service Worker and resiliently cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching App Shell assets');
        return Promise.allSettled(
          ASSETS_TO_CACHE.map((url) => {
            return cache.add(url).catch((err) => {
              console.warn('[Service Worker] Could not pre-cache asset:', url, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event (clean up old caches and claim clients)
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

// Fetch event (Network-first for navigation, Cache-first with stale-while-revalidate for static assets)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const isNavigationRequest = event.request.mode === 'navigate';

  if (isNavigationRequest) {
    // Navigation (HTML pages): Network first, fallback to cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to main index if page is missing from cache offline
            return caches.match('index.html') || caches.match('./');
          });
        })
    );
  } else {
    // Static resources (CSS, JS, Images, Fonts): Cache first, fallback to network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update in background (Stale-While-Revalidate)
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => { /* silent fail when offline */ });
          
          return cachedResponse;
        }

        // Cache miss: fetch from network and cache
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch((err) => {
          console.log('[Service Worker] Resource fetch failed offline:', event.request.url, err);
        });
      })
    );
  }
});
