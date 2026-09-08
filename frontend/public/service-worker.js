// frontend/public/service-worker.js
// GDGSC Vault & Media Cache-First Service Worker

const CACHE_NAME = 'gdgsc-media-cache-v1';

// Match media assets: Google Drive proxy files, local static images, logos, uploads
const isMediaRequest = (url, request) => {
  if (request.method !== 'GET') return false;

  // Destination check
  if (request.destination === 'image') return true;

  const pathname = url.pathname;

  // Google Drive proxy assets
  if (pathname.includes('/api/assets/drive/')) return true;

  // Static images and assets folders
  if (pathname.startsWith('/images/') || pathname.startsWith('/assets/')) return true;

  // Image file extensions
  if (/\.(png|jpe?g|webp|svg|gif|ico|avif)$/i.test(pathname)) return true;

  return false;
};

self.addEventListener('install', (event) => {
  // Activate worker immediately without waiting for old tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up any outdated caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!isMediaRequest(url, event.request)) {
    return; // Pass through to standard browser network pipeline
  }

  // Skip caching for downloads
  if (url.searchParams.get('download') === 'true') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Try CacheStorage
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Fetch from network and populate cache
      try {
        const networkResponse = await fetch(event.request);

        // Cache valid responses (200 or opaque CORS responses type 'opaque')
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch (err) {
        // If network failed and we have no cache, return empty response
        console.warn('[ServiceWorker] Network request failed for:', event.request.url);
        throw err;
      }
    })
  );
});
