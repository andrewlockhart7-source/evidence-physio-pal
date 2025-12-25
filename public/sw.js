const CACHE_NAME = 'physio-evidence-v3';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Ensure new SW activates immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigations and core assets to avoid stale app shell
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isNavigation = req.mode === 'navigate';
  const isCoreAsset = ['script', 'style', 'worker'].includes(req.destination);
  const url = new URL(req.url);

  // For navigation requests (page loads), always serve index.html for SPA routing
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // If server returns 404, serve index.html instead for client-side routing
          if (response.status === 404) {
            return caches.match('/').then(cached => cached || fetch('/'));
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match('/').then(cached => cached || fetch('/')))
    );
    return;
  }

  // Network-first for core assets
  if (isCoreAsset) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for other GET requests
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            try {
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            } catch (_) {}
            return networkRes;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});