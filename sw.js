const CACHE_STATIC_KEY = 'nitro-pwa-static-v8';
const CACHE_CDN_KEY = 'nitro-pwa-cdn-v8';

const staticAssets = [
  '/index.html',
  '/sw.js',
  '/manifest.json',
];

const cdnAssets = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC_KEY).then(cache => cache.addAll(staticAssets).catch(err => { console.error('[SW] Greška pri keširanju statike:', err); })),
      caches.open(CACHE_CDN_KEY).then(cache => {
        const cdnRequests = cdnAssets.map(url => {
          return fetch(url).then(response => {
            if (!response || response.status !== 200) return Promise.resolve();
            let responseClone = response.clone();
            return cache.put(url, responseClone);
          });
        });
        return Promise.all(cdnRequests);
      })
    ])
    .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_STATIC_KEY, CACHE_CDN_KEY];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) return caches.delete(cacheName);
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 1. AniList GraphQL API
  if (url.hostname.includes('anilist.co')) {
    event.respondWith(fetch(event.request).catch(() => new Response('{"error": "API Error or Offline"}', { headers: { 'Content-Type': 'application/json' }, status: 503 })));
    return;
  }
  
  // 2. CDN Resursi (Cache First)
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) return response;
        
        return fetch(event.request).then(networkResponse => {
            let responseClone = networkResponse.clone(); 
            caches.open(CACHE_CDN_KEY).then(cache => {
              cache.put(event.request, responseClone);
            });
            return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Lokalni statički fajlovi (Network First)
  event.respondWith(
    fetch(event.request).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        let responseClone = networkResponse.clone(); 
        const assetPath = url.pathname;
        if (staticAssets.includes(assetPath)) {
           caches.open(CACHE_STATIC_KEY).then(cache => {
             cache.put(event.request, responseClone);
           });
        }
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        return caches.match('/index.html');
      });
    })
  );
});
