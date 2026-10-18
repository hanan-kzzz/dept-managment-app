const CACHE_NAME = 'cashly-pwa-v9';

const ASSETS_TO_CACHE = [
  './',
  'index.html',
  
  // Sales Pages
  'pages/sales/sales.html',
  'pages/sales/new-sale.html',
  'pages/sales/dues.html',
  
  // Inventory Pages
  'pages/inventory/stock.html',
  'pages/inventory/product-details.html',
  'pages/inventory/barcode-management.html',
  'pages/inventory/market-prices.html',
  
  // Customer Pages
  'pages/customers/customers.html',
  'pages/customers/customer-details.html',
  
  // Settings Pages
  'pages/settings/settings.html',
  'pages/settings/notifications.html',
  'pages/settings/notifications/index.html',
  'pages/settings/shop-profile/index.html',
  'pages/settings/business-details/index.html',
  'pages/settings/bill-settings/index.html',
  'pages/settings/appearance/index.html',
  'pages/settings/currency/index.html',
  'pages/settings/backup/index.html',
  'pages/settings/language/index.html',
  'pages/settings/about/index.html',
  'pages/settings/whatsapp/index.html',
  'pages/settings/telegram/index.html',
  
  // Auth Pages
  'auth/login.html',
  'auth/signup.html',
  'auth/welcome.html',
  'auth/forgot-password.html',
  'auth/otp-verification.html',
  'auth/reset-password.html',
  
  // CSS Files
  'css/style.css',
  'css/dashboard.css',
  'css/customers.css',
  'css/stock.css',
  'css/settings.css',
  'css/market-prices.css',
  'css/auth.css',
  'css/responsive.css',
  
  // JS Files
  'js/loader.js',
  'js/app.js',
  'js/storage.js',
  'js/utils.js',
  'js/pwa-manager.js',
  'js/notifications.js',
  'js/customers.js',
  'js/stock.js',
  'js/sales.js',
  'js/dues.js',
  'js/settings.js',
  'js/barcode.js',
  'js/barcode-management.js',
  'js/scanner.js',
  'js/market-prices.js',
  'js/marketPriceService.js',
  
  // Manifest & Icons
  'manifest.json',
  'favicon.ico',
  'favicon.png',
  'images/favicon.png',
  'images/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  
  // Key Graphics
  'images/login_hero_bg.jpg',
  'images/login_hero_bg_borderless.jpg',
  'images/login_hero_wallet.jpg',
  'images/login_ill.jpg',
  'images/signup_ill.jpg',
  'images/bg_growth.jpg'
];

// Install Service Worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Cashly SW] Caching App Shell assets');
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => 
            cache.add(url).catch(err => {
              console.warn('[Cashly SW] Failed to cache:', url, err);
            })
          )
        );
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
            console.log('[Cashly SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Navigation Fallback Helper
async function getNavigationFallback(request, url) {
  const path = url.pathname;
  const relativePath = path.replace(/^\//, '');

  const matches = [
    request,
    path,
    path + '.html',
    relativePath,
    relativePath + '.html',
    'index.html'
  ];

  for (const item of matches) {
    const match = await caches.match(item);
    if (match) return match;
  }
  return null;
}

// Fetch event (Network First with fallback to Cache & Dynamic CDN caching)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Skip browser-extension or chrome-extension schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);

        // If server returned 404 for a navigation request (e.g. clean URL on static dev server)
        if (response.status === 404 && event.request.mode === 'navigate') {
          const fallback = await getNavigationFallback(event.request, url);
          if (fallback) return fallback;
        }

        // Cache valid responses dynamically (including CORS/opaque CDNs)
        if (response && (response.status === 200 || response.type === 'opaque' || response.type === 'cors')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return response;
      } catch (err) {
        // Network failed - attempt cache fallback
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Navigation fallback for offline mode
        if (event.request.mode === 'navigate') {
          const fallback = await getNavigationFallback(event.request, url);
          if (fallback) return fallback;
        }

        console.warn('[Cashly SW] Resource offline fetch failed:', event.request.url);
      }
    })()
  );
});
