// Auto-generated at build time — do not edit manually.
const CACHE_VERSION = 'mr6ooxmx';
const STATIC_CACHE = 'self-quiz-static-' + CACHE_VERSION;
const RUNTIME_CACHE = 'self-quiz-runtime-' + CACHE_VERSION;
// App shell and critical static assets to precache on install
const PRECACHE_ASSETS = ['/', '/manifest.webmanifest', '/icon.svg', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  );
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isNextStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Let API requests fall through — they will fail gracefully when offline
  // because the app code already checks navigator.onLine before calling them.
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Navigation requests (HTML pages): network-first, fall back to cached app shell
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh HTML for future offline use
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          // Try the exact URL first, then fall back to the precached app shell
          caches.match(event.request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Next.js static chunks: cache-first (immutable assets with content-hash filenames)
  if (isNextStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // All other assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});
