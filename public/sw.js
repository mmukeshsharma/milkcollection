const CACHE_NAME = 'sharma-dairy-cache-v2';
const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/logo.png',
  '/icon.png',
  '/apple-icon.png',
  '/manifest.webmanifest',
];

// Helper to determine cache key based on Next.js RSC headers
function getCacheKey(request) {
  const isRSC = request.headers.has('RSC') || 
                request.headers.has('rsc') || 
                request.headers.has('Next-Router-State-Tree');
  if (isRSC) {
    // Append a suffix to avoid caching conflict between HTML and RSC components
    return new Request(request.url + (request.url.includes('?') ? '&' : '?') + '_rsc=1');
  }
  return request;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass POST/PUT/DELETE, API calls, and Next.js Server Actions
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    request.headers.has('next-action')
  ) {
    return;
  }

  // Handle local application routes and assets
  if (url.origin === self.location.origin) {
    const isNavigation = request.mode === 'navigate';
    const isRSC = request.headers.has('RSC') || request.headers.has('rsc');

    // Pages & RSC data payloads: Network-First falling back to Cache
    if (isNavigation || isRSC) {
      const cacheKey = getCacheKey(request);
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(cacheKey, copy);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(cacheKey).then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              // If page navigation fails entirely, fallback to cached root page
              if (isNavigation) return caches.match('/');
            });
          })
      );
      return;
    }

    // Static assets (Next.js chunks, CSS, images, public files): Cache-First falling back to Network
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }
          return response;
        });
      })
    );
  }
});
